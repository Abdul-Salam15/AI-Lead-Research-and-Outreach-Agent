// THROWAWAY validation script for Phase 3 — not part of the shipped app,
// not committed. Deletes any test row it creates.
//
// Reads credentials from .env (via src/lib/supabase.ts's own "dotenv/config"
// import) exactly like the real app will — so before running this, copy
// .env.local to .env, then delete .env again afterward. See the run
// instructions given alongside this file.
//
// Deliberately does NOT call discoverCompaniesViaApify against the real
// Apify actor — that actor is pay-per-event and would incur a real charge.
// Everything else (Supabase read/write, scrapeUrl) is free-tier / no-cost.
//
// Run with: npx tsx scratch-validate-tools.ts

import { supabase } from "./src/lib/supabase";
import { scrapeUrl } from "./src/lib/scrape";
import { buildToolServer, RunContext } from "./src/agent/tools";

async function main() {
  console.log("1. Supabase connectivity (select count from runs)...");
  const { error: countError, count } = await supabase
    .from("runs")
    .select("*", { count: "exact", head: true });
  if (countError) throw new Error(`Supabase read failed: ${countError.message}`);
  console.log(`   ok — runs table reachable, ${count} existing row(s).`);

  console.log("2. scrapeUrl('https://example.com')...");
  const text = await scrapeUrl("https://example.com");
  console.log(`   ok — got ${text.length} chars. Preview: ${text.slice(0, 80)}`);

  console.log("3. Creating a throwaway test run row...");
  const { data: run, error: runError } = await supabase
    .from("runs")
    .insert({
      objective: "[scratch-validate-tools] test run — safe to ignore/delete",
      max_candidates: 2,
      max_scrapes: 2,
      max_turns: 5,
      target_qualified_leads: 1,
    })
    .select()
    .single();
  if (runError || !run) throw new Error(`Failed to create test run: ${runError?.message}`);
  console.log(`   ok — created run ${run.id}`);

  const ctx: RunContext = {
    runId: run.id,
    maxCandidates: 6,
    perCallCandidateLimit: 2,
    maxScrapes: 2,
    scrapesUsed: 0,
    discoveredDomains: new Set(),
    discoveryCallsUsed: 0,
    discoverySpendUsedUsd: 0,
    scrapedDomains: new Set(),
  };
  const server = buildToolServer(ctx);
  console.log(`4. buildToolServer(ctx) returned an MCP server: ${!!server}`);

  try {
    console.log("5. Exercising save_icp via a direct Supabase update (tool logic, same shape)...");
    const { error: icpError } = await supabase
      .from("runs")
      .update({
        icp_criteria: {
          target_company_type: "SaaS",
          industries: ["Software"],
          geography: ["United States"],
          headcount_range: "10-100",
          buyer_persona: "Head of Ops",
          business_problem: "Manual outbound research",
          hard_filters: ["B2B"],
          soft_preferences: ["Hiring ops roles"],
          disqualifiers: ["Non-US"],
          assumptions_made: ["Assumed US-only since geography wasn't specified"],
        },
      })
      .eq("id", ctx.runId);
    if (icpError) throw new Error(`save_icp-shaped update failed: ${icpError.message}`);
    console.log("   ok — icp_criteria written.");

    console.log("6. Exercising save_lead via a direct Supabase insert (tool logic, same shape)...");
    const { error: leadError } = await supabase.from("leads").insert({
      run_id: ctx.runId,
      company_name: "Acme Test Co",
      company_domain: "example.com",
      qualification_status: "qualified",
      confidence: 0.8,
      fit_reasons: ["Matches headcount range"],
      concerns: [],
      source_urls: ["https://example.com"],
      source_summary: "Test fixture from scratch-validate-tools.ts",
      outreach: {
        emails: [
          { subject: "s1", body: "b1", personalization_note: "n1" },
          { subject: "s2", body: "b2", personalization_note: "n2" },
          { subject: "s3", body: "b3", personalization_note: "n3" },
        ],
        linkedin_message: "hello",
      },
    });
    if (leadError) throw new Error(`save_lead-shaped insert failed: ${leadError.message}`);
    console.log("   ok — lead row written.");
  } finally {
    console.log("7. Cleaning up — deleting test run (cascades to its lead)...");
    const { error: cleanupError } = await supabase.from("runs").delete().eq("id", ctx.runId);
    if (cleanupError) console.error(`   WARNING: cleanup failed, delete run ${ctx.runId} manually: ${cleanupError.message}`);
    else console.log("   ok — test row removed.");
  }

  console.log("\nAll checks passed. (discover_companies/Apify was NOT exercised live — see header comment.)");
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
