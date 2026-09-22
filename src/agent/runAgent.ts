import { query } from "@anthropic-ai/claude-agent-sdk";
import { supabase } from "../lib/supabase";
import { buildToolServer, RunContext } from "./tools";
import { buildHooks } from "./hooks";
import { buildSystemPrompt } from "./systemPrompt";

export async function runAgent(runId: string) {
  const { data: run } = await supabase.from("runs").select("*").eq("id", runId).single();
  if (!run) throw new Error("Run not found");

  const ctx: RunContext = {
    runId,
    maxCandidates: run.max_candidates,
    maxScrapes: run.max_scrapes,
    scrapesUsed: 0,
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
        hooks: buildHooks(runId),
        model: "claude-sonnet-5",
      },
    });

    // query() returns an AsyncGenerator<SDKMessage>, not a Promise of a
    // final result — it has to be iterated to actually drive the run. The
    // last "result" message (SDKResultMessage) carries total_cost_usd.
    let totalCostUsd: number | null = null;
    for await (const message of stream) {
      if (message.type === "result") {
        totalCostUsd = message.total_cost_usd;
      }
    }

    await supabase.from("runs").update({
      status: "completed",
      total_cost_usd: totalCostUsd,
      completed_at: new Date().toISOString(),
    }).eq("id", runId);

  } catch (err: any) {
    await supabase.from("runs").update({
      status: "failed",
      error_message: String(err?.message ?? err),
      completed_at: new Date().toISOString(),
    }).eq("id", runId);
  }
}
