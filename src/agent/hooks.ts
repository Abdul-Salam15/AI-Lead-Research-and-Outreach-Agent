import { supabase } from "../lib/supabase";

const ALLOWED_TOOLS = new Set([
  "Skill",
  "mcp__lead-tools__save_icp",
  "mcp__lead-tools__discover_companies",
  "mcp__lead-tools__scrape_website",
  "mcp__lead-tools__save_lead",
]);

export function buildHooks(runId: string) {
  return {
    PreToolUse: [
      {
        hooks: [
          async (input: any) => {
            if (!ALLOWED_TOOLS.has(input.tool_name)) {
              const reason = `${input.tool_name} is outside this project's allowed tool set.`;
              // A denied call never reaches PostToolUse (the SDK stops it
              // before execution), so without this it would never appear
              // in the audit log at all — leaving the schema's own
              // 'blocked' status (migration 0001) permanently unused and
              // silently failing Phase 4's goal of auditing every tool
              // call "regardless of which specific tool ran."
              await supabase.from("tool_calls").insert({
                run_id: runId,
                tool_name: input.tool_name,
                purpose: describePurpose(input.tool_name),
                input_summary: safeSlice(input.tool_input),
                result_summary: null,
                status: "blocked",
                error_message: reason,
              });
              return {
                hookSpecificOutput: {
                  hookEventName: "PreToolUse",
                  permissionDecision: "deny",
                  permissionDecisionReason: reason,
                },
              };
            }
            return {};
          },
        ],
      },
    ],
    PostToolUse: [
      {
        hooks: [
          async (input: any) => {
            const isError = Boolean(input.tool_response?.is_error);
            await supabase.from("tool_calls").insert({
              run_id: runId,
              tool_name: input.tool_name,
              purpose: describePurpose(input.tool_name),
              input_summary: safeSlice(input.tool_input),
              result_summary: safeSlice(input.tool_response),
              status: isError ? "error" : "success",
              error_message: isError ? safeSlice(input.tool_response) : null,
            });
            return {};
          },
        ],
      },
    ],
  };
}

function describePurpose(toolName: string): string {
  const map: Record<string, string> = {
    "mcp__lead-tools__discover_companies": "Find candidate companies via Apify",
    "mcp__lead-tools__scrape_website": "Gather evidence from a company's public site",
    "mcp__lead-tools__save_icp": "Persist refined ICP criteria",
    "mcp__lead-tools__save_lead": "Persist a qualification decision and outreach drafts",
    Skill: "Consult a guidance skill",
  };
  return map[toolName] ?? "Unrecognized tool";
}

function safeSlice(value: unknown): string {
  try { return JSON.stringify(value).slice(0, 500); } catch { return String(value).slice(0, 500); }
}
