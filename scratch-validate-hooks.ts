// THROWAWAY validation script for Phase 4 — not part of the shipped app,
// not committed. Creates and deletes a test `runs` row. Copy .env.local to
// .env before running (src/lib/supabase.ts reads .env via "dotenv/config").
//
// Run with: npx tsx scratch-validate-hooks.ts

import { supabase } from "./src/lib/supabase";
import { buildHooks } from "./src/agent/hooks";

async function main() {
  console.log("1. Creating a throwaway test run row...");
  const { data: run, error: runError } = await supabase
    .from("runs")
    .insert({
      objective: "[scratch-validate-hooks] test run — safe to ignore/delete",
      max_candidates: 2,
      max_scrapes: 2,
      max_turns: 5,
      target_qualified_leads: 1,
    })
    .select()
    .single();
  if (runError || !run) throw new Error(`Failed to create test run: ${runError?.message}`);
  console.log(`   ok — created run ${run.id}`);

  const hooks = buildHooks(run.id);
  const preToolUse = hooks.PreToolUse[0].hooks[0];
  const postToolUse = hooks.PostToolUse[0].hooks[0];

  try {
    console.log("2. PreToolUse with a disallowed/mistyped tool name...");
    const denyResult: any = await preToolUse({ tool_name: "mcp__lead-tools__delete_everything" });
    console.log("   result:", JSON.stringify(denyResult));
    if (denyResult?.hookSpecificOutput?.permissionDecision !== "deny") {
      throw new Error("Expected permissionDecision 'deny' for a disallowed tool");
    }
    console.log("   ok — denied as expected.");

    console.log("3. PreToolUse with an allowed tool name...");
    const allowResult: any = await preToolUse({ tool_name: "mcp__lead-tools__save_icp" });
    console.log("   result:", JSON.stringify(allowResult));
    if (Object.keys(allowResult ?? {}).length !== 0) {
      throw new Error("Expected {} (no deny) for an allowed tool");
    }
    console.log("   ok — allowed as expected.");

    console.log("4. PostToolUse for a successful call...");
    await postToolUse({
      tool_name: "mcp__lead-tools__discover_companies",
      tool_input: { searchQuery: "B2B SaaS, 10-100 employees, US" },
      tool_response: { content: [{ type: "text", text: "[]" }] },
    });
    console.log("   ok — insert did not throw.");

    console.log("5. PostToolUse for an errored call...");
    await postToolUse({
      tool_name: "mcp__lead-tools__scrape_website",
      tool_input: { url: "https://example.com" },
      tool_response: { is_error: true, content: [{ type: "text", text: "boom" }] },
    });
    console.log("   ok — insert did not throw.");

    console.log("6. Verifying tool_calls rows landed with the right shape...");
    const { data: rows, error: rowsError } = await supabase
      .from("tool_calls")
      .select("*")
      .eq("run_id", run.id)
      .order("created_at", { ascending: true });
    if (rowsError) throw new Error(`Failed to read tool_calls: ${rowsError.message}`);
    console.log(`   ok — ${rows?.length} row(s):`);
    for (const row of rows ?? []) {
      console.log(
        `     - ${row.tool_name} | status=${row.status} | purpose="${row.purpose}" | error_message=${JSON.stringify(row.error_message)}`
      );
    }
    if (rows?.length !== 2) throw new Error(`Expected 2 tool_calls rows, got ${rows?.length}`);
    if (rows[0].status !== "success" || rows[1].status !== "error") {
      throw new Error("Expected first row success, second row error");
    }
  } finally {
    console.log("7. Cleaning up — deleting test run (cascades to its tool_calls rows)...");
    const { error: cleanupError } = await supabase.from("runs").delete().eq("id", run.id);
    if (cleanupError) console.error(`   WARNING: cleanup failed, delete run ${run.id} manually: ${cleanupError.message}`);
    else console.log("   ok — test row removed.");
  }

  console.log("\nAll checks passed.");
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
