import { query } from "@anthropic-ai/claude-agent-sdk";
import { supabase } from "../lib/supabase";
import { buildToolServer, RunContext } from "./tools";
import { buildHooks } from "./hooks";
import { buildSystemPrompt } from "./systemPrompt";
import { getCurrentMaxCandidates } from "../lib/apify";

// Runs currently in flight on this server process, keyed by run id — the
// only way a separate HTTP request (POST /api/runs/:id/stop) can reach the
// right query() stream to interrupt it. In-memory only: a run started
// before a server restart can no longer be stopped this way, only its DB
// row can be inspected.
const activeRuns = new Map<string, ReturnType<typeof query>>();

export async function stopRun(runId: string): Promise<boolean> {
  const stream = activeRuns.get(runId);
  if (!stream) return false;

  await stream.interrupt();

  // Guarded by .eq("status", "running") so this is a no-op if runAgent's
  // own completion handler already wrote a final status first — whichever
  // write actually lands, the other becomes harmless.
  const { error } = await supabase.from("runs")
    .update({ status: "stopped", completed_at: new Date().toISOString() })
    .eq("id", runId)
    .eq("status", "running");

  activeRuns.delete(runId);

  if (error) {
    // The interrupt itself still succeeded — the agent has stopped — but
    // the status row didn't update (e.g. migration 0002 not yet applied,
    // so "stopped" isn't a valid status value). Log it rather than swallow
    // it, since the caller has no other way to notice.
    console.error(`stopRun(${runId}): interrupted the agent but failed to write status=stopped:`, error.message);
  }

  return true;
}

export async function runAgent(runId: string) {
  const { data: run } = await supabase.from("runs").select("*").eq("id", runId).single();
  if (!run) throw new Error("Run not found");

  // Fetched once, held fixed for the whole run, so a run's behavior stays
  // predictable even if calibration updates mid-run from its own earlier
  // calls — the ramp-up applies to the *next* run, not retroactively to
  // this one.
  const perCallCandidateLimit = await getCurrentMaxCandidates();

  const ctx: RunContext = {
    runId,
    maxCandidates: run.max_candidates, // run-wide candidate target
    perCallCandidateLimit,             // self-calibrated per-call Apify request size
    maxScrapes: run.max_scrapes,
    scrapesUsed: 0,
    discoveredDomains: new Set(),
    discoveryCallsUsed: 0,
  };

  const toolServer = buildToolServer(ctx);

  try {
    const stream = query({
      prompt: `Qualification objective: ${run.objective}\n\nTarget qualified leads: ${run.target_qualified_leads}`,
      options: {
        systemPrompt: buildSystemPrompt(run.target_qualified_leads),
        cwd: process.cwd(),
        settingSources: ["project"],       // discovers .claude/skills/ at project root
        skills: "all",
        mcpServers: { "lead-tools": toolServer },
        allowedTools: [
          "Skill",
          "mcp__lead-tools__save_icp",
          "mcp__lead-tools__discover_companies",
          "mcp__lead-tools__scrape_website",
          "mcp__lead-tools__save_lead",
        ],
        maxTurns: run.max_turns,
        maxBudgetUsd: Number(process.env.MAX_BUDGET_USD ?? 3),
        hooks: buildHooks(runId),
        model: "claude-sonnet-5",
      },
    });

    activeRuns.set(runId, stream);

    // query() returns an AsyncGenerator<SDKMessage>, not a Promise of a
    // final result — it has to be iterated to actually drive the run. The
    // last "result" message (SDKResultMessage) carries total_cost_usd.
    let totalCostUsd: number | null = null;
    for await (const message of stream) {
      if (message.type === "result") {
        totalCostUsd = message.total_cost_usd;
      }
    }

    // .eq("status", "running") makes this a no-op if stopRun() already won
    // the race and wrote "stopped" first.
    await supabase.from("runs").update({
      status: "completed",
      total_cost_usd: totalCostUsd,
      completed_at: new Date().toISOString(),
    }).eq("id", runId).eq("status", "running");

  } catch (err: any) {
    const errorMessage = String(err?.message ?? err);

    // Running out of turns or budget after saving real leads isn't a
    // failure — it's the same "finished short of target" concept the UI
    // already surfaces as "partial". Only genuine errors (crashes, auth
    // failures, network errors) should still read as "failed". Detected by
    // matching the phrasing actually observed from the SDK/CLI in testing
    // (e.g. "Reached maximum number of turns (40)"), since there's no
    // structured error code surfaced through the thrown error itself.
    const hitAConfiguredLimit = /max.{0,3}(turns|budget)/i.test(errorMessage);
    const { count: leadCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("run_id", runId);

    await supabase.from("runs").update({
      status: hitAConfiguredLimit && (leadCount ?? 0) > 0 ? "partial" : "failed",
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    }).eq("id", runId).eq("status", "running");
  } finally {
    activeRuns.delete(runId);
  }
}
