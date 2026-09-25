// THROWAWAY validation script for Phase 5 — not part of the shipped app,
// not committed. Inserts one narrow, cheap test `runs` row directly into
// Supabase and calls runAgent(runId) directly — no HTTP route exists yet
// (that's Phase 6). This is a REAL run: it spawns the `claude` CLI
// subprocess, calls the real Apify actor (pay-per-event — real cost),
// Firecrawl, and the Anthropic API.
//
// Copy .env.local to .env before running (src/lib/supabase.ts and the
// agent subprocess both read .env via "dotenv/config").
//
// Run with: npx tsx scratch-validate-agent.ts

import { supabase } from "./src/lib/supabase";
import { runAgent } from "./src/agent/runAgent";

async function main() {
  console.log("1. Creating a narrow, cheap test run row...");
  const { data: run, error: runError } = await supabase
    .from("runs")
    .insert({
      objective: "Find 2 US-based project management SaaS companies, 10-50 employees",
      max_candidates: 2,
      max_scrapes: 4,
      max_turns: 20,
      target_qualified_leads: 2,
    })
    .select()
    .single();
  if (runError || !run) throw new Error(`Failed to create test run: ${runError?.message}`);
  console.log(`   ok — created run ${run.id}`);
  console.log(`   objective: "${run.objective}"`);
  console.log(`   limits: max_candidates=${run.max_candidates} max_scrapes=${run.max_scrapes} max_turns=${run.max_turns}`);

  console.log("\n2. Calling runAgent(runId) — this is a real agent run, may take a few minutes...\n");
  await runAgent(run.id);

  console.log("\n3. Fetching the final run record...");
  const { data: finalRun, error: finalRunError } = await supabase
    .from("runs")
    .select("*")
    .eq("id", run.id)
    .single();
  if (finalRunError || !finalRun) throw new Error(`Failed to fetch final run: ${finalRunError?.message}`);
  console.log("   run:", JSON.stringify(finalRun, null, 2));

  console.log("\n4. Fetching leads for this run...");
  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("*")
    .eq("run_id", run.id);
  if (leadsError) throw new Error(`Failed to fetch leads: ${leadsError.message}`);
  console.log(`   ${leads?.length ?? 0} lead(s):`);
  for (const lead of leads ?? []) {
    console.log(`   - ${lead.company_name} (${lead.company_domain}) — ${lead.qualification_status}, confidence=${lead.confidence}`);
  }

  console.log("\n5. Fetching tool_calls for this run...");
  const { data: toolCalls, error: toolCallsError } = await supabase
    .from("tool_calls")
    .select("*")
    .eq("run_id", run.id)
    .order("created_at", { ascending: true });
  if (toolCallsError) throw new Error(`Failed to fetch tool_calls: ${toolCallsError.message}`);
  console.log(`   ${toolCalls?.length ?? 0} tool_calls row(s):`);
  for (const tc of toolCalls ?? []) {
    console.log(`   - ${tc.tool_name} | status=${tc.status} | ${tc.purpose}`);
  }

  console.log(`\nRun id (not deleted — for your review): ${run.id}`);
  console.log("Delete it yourself once you've reviewed it in the Supabase dashboard.");
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
