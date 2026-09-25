import { query } from "@anthropic-ai/claude-agent-sdk";
import { supabase } from "../lib/supabase";
import { buildToolServer, RunContext } from "./tools";
import { buildHooks } from "./hooks";
import { buildIcpSystemPrompt, buildDiscoverySystemPrompt } from "./systemPrompt";
import { getCurrentMaxCandidates } from "../lib/apify";
import { notifyRunOwner, notifyIcpAwaitingConfirmation } from "../lib/notify";

// Runs currently in flight on this server process, keyed by run id — the
// only way a separate HTTP request (POST /api/runs/:id/stop) can reach the
// right query() stream to interrupt it. In-memory only: a run started
// before a server restart can no longer be stopped this way, only its DB
// row can be inspected. Shared across both phases below — only one of them
// is ever active for a given run at a time.
const activeRuns = new Map<string, ReturnType<typeof query>>();

export async function stopRun(runId: string): Promise<boolean> {
  const stream = activeRuns.get(runId);
  if (!stream) return false;

  await stream.interrupt();

  // Guarded by .eq("status", "running") so this is a no-op if the phase's
  // own completion handler already wrote a final status first — whichever
  // write actually lands, the other becomes harmless.
  const { data: updatedRun, error } = await supabase.from("runs")
    .update({ status: "stopped", completed_at: new Date().toISOString() })
    .eq("id", runId)
    .eq("status", "running")
    .select()
    .maybeSingle();

  activeRuns.delete(runId);

  if (error) {
    // The interrupt itself still succeeded — the agent has stopped — but
    // the status row didn't update (e.g. migration 0002 not yet applied,
    // so "stopped" isn't a valid status value). Log it rather than swallow
    // it, since the caller has no other way to notice.
    console.error(`stopRun(${runId}): interrupted the agent but failed to write status=stopped:`, error.message);
  } else if (updatedRun) {
    // Only reached when THIS write actually won the race against the
    // phase's own completion handler — otherwise that handler already
    // sent its own notification for whichever status landed first.
    notifyRunOwner(updatedRun).catch(() => {});
  }

  return true;
}

// Built fresh for each phase — discovery/scrape counters always start at
// zero for phase 2 too, since nothing was discovered or scraped in phase 1.
function buildRunContext(run: any, perCallCandidateLimit: number): RunContext {
  return {
    runId: run.id,
    maxCandidates: run.max_candidates, // run-wide candidate target
    perCallCandidateLimit,             // self-calibrated per-call Apify request size
    maxScrapes: run.max_scrapes,
    scrapesUsed: 0,
    discoveredDomains: new Set(),
    discoveryCallsUsed: 0,
    discoverySpendUsedUsd: 0,
    scrapedDomains: new Set(),
  };
}

// Phase 1: ICP refinement only. allowedTools is deliberately narrow (Skill +
// save_icp) so the agent cannot reach discover_companies/scrape_website/
// save_lead in this phase no matter what the prompt says — the run always
// pauses here for a human to review and optionally edit the ICP before
// company search starts (POST /api/runs/:id/confirm-icp runs phase 2).
export async function runIcpPhase(runId: string) {
  const { data: run } = await supabase.from("runs").select("*").eq("id", runId).single();
  if (!run) throw new Error("Run not found");

  const ctx = buildRunContext(run, await getCurrentMaxCandidates());
  const toolServer = buildToolServer(ctx);

  try {
    const stream = query({
      prompt: `Qualification objective: ${run.objective}\n\nTarget qualified leads: ${run.target_qualified_leads}`,
      options: {
        systemPrompt: buildIcpSystemPrompt(),
        cwd: process.cwd(),
        settingSources: ["project"],
        skills: "all",
        mcpServers: { "lead-tools": toolServer },
        allowedTools: ["Skill", "mcp__lead-tools__save_icp"],
        maxTurns: run.max_turns,
        maxBudgetUsd: Number(process.env.MAX_BUDGET_USD ?? 3),
        hooks: buildHooks(runId),
        model: "claude-sonnet-5",
      },
    });

    activeRuns.set(runId, stream);
    for await (const _message of stream) {
      // Nothing to collect here — save_icp itself already persisted
      // icp_criteria as soon as the agent called it.
    }

    const { data: savedRun } = await supabase.from("runs").select("icp_criteria").eq("id", runId).single();
    const icpSaved = Boolean(savedRun?.icp_criteria);

    const { data: updatedRun } = await supabase.from("runs").update(
      icpSaved
        ? { status: "awaiting_confirmation" }
        : { status: "failed", error_message: "The agent finished without saving ICP criteria.", completed_at: new Date().toISOString() }
    ).eq("id", runId).eq("status", "running").select().maybeSingle();

    if (updatedRun) {
      if (icpSaved) notifyIcpAwaitingConfirmation(updatedRun).catch(() => {});
      else notifyRunOwner(updatedRun).catch(() => {});
    }

  } catch (err: any) {
    const errorMessage = String(err?.message ?? err);
    const { data: updatedRun } = await supabase.from("runs").update({
      status: "failed",
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    }).eq("id", runId).eq("status", "running").select().maybeSingle();

    if (updatedRun) notifyRunOwner(updatedRun).catch(() => {});
  } finally {
    activeRuns.delete(runId);
  }
}

// Phase 2: discovery through outreach drafting. Only ever started after a
// human has confirmed (and possibly edited) run.icp_criteria — see
// POST /api/runs/:id/confirm-icp in src/routes/runs.ts, which flips status
// back to "running" immediately before calling this.
export async function runDiscoveryPhase(runId: string) {
  const { data: run } = await supabase.from("runs").select("*").eq("id", runId).single();
  if (!run) throw new Error("Run not found");
  if (!run.icp_criteria) throw new Error(`runDiscoveryPhase(${runId}) called before ICP was confirmed`);

  const perCallCandidateLimit = await getCurrentMaxCandidates();
  const ctx = buildRunContext(run, perCallCandidateLimit);
  const toolServer = buildToolServer(ctx);

  try {
    const stream = query({
      prompt: `Qualification objective: ${run.objective}\n\nTarget qualified leads: ${run.target_qualified_leads}\n\n` +
        `Confirmed ICP criteria (already reviewed and possibly edited by a human — use exactly as given, do not re-refine):\n` +
        JSON.stringify(run.icp_criteria, null, 2),
      options: {
        systemPrompt: buildDiscoverySystemPrompt(run.target_qualified_leads, run.max_candidates, run.max_scrapes),
        cwd: process.cwd(),
        settingSources: ["project"],
        skills: "all",
        mcpServers: { "lead-tools": toolServer },
        allowedTools: [
          "Skill",
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
    // last "result" message (SDKResultMessage) carries total_cost_usd and,
    // on subtype "success", the agent's final assistant text in `result` —
    // this is where its shortfall explanation (lead-list-quality guide)
    // ends up when it returns fewer than target_qualified_leads.
    let totalCostUsd: number | null = null;
    let summary: string | null = null;
    for await (const message of stream) {
      if (message.type === "result") {
        totalCostUsd = message.total_cost_usd;
        if (message.subtype === "success") summary = message.result;
      }
    }

    // .eq("status", "running") makes this a no-op if stopRun() already won
    // the race and wrote "stopped" first.
    const { data: updatedRun } = await supabase.from("runs").update({
      status: "completed",
      total_cost_usd: totalCostUsd,
      summary,
      completed_at: new Date().toISOString(),
    }).eq("id", runId).eq("status", "running").select().maybeSingle();

    if (updatedRun) notifyRunOwner(updatedRun).catch(() => {});

  } catch (err: any) {
    const errorMessage = String(err?.message ?? err);

    // Any real progress (at least one saved lead) is reported as "partial"
    // regardless of *why* the run stopped — a turn/budget limit, a network
    // blip, an Apify poll timeout, anything else. Those leads are genuinely
    // there and reviewable, so calling the run "failed" when it actually
    // produced usable output understates real progress. "failed" is
    // reserved for a run that produced nothing at all.
    const { count: leadCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("run_id", runId);

    const { data: updatedRun } = await supabase.from("runs").update({
      status: (leadCount ?? 0) > 0 ? "partial" : "failed",
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    }).eq("id", runId).eq("status", "running").select().maybeSingle();

    if (updatedRun) notifyRunOwner(updatedRun).catch(() => {});
  } finally {
    activeRuns.delete(runId);
  }
}
