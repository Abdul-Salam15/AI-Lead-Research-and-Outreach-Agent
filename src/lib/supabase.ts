import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS entirely. Used by the background
// agent loop (runAgent.ts / tools.ts / hooks.ts), which has no per-request
// user/JWT context and must be able to write any run's rows regardless of
// who owns it, and by requireAuth.ts to verify a caller's token.
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Per-request client carrying one user's access token — this is what
// actually makes RLS the enforcement boundary for user-facing routes
// (src/routes/runs.ts, src/routes/leads.ts) instead of the service-role
// client, which would silently bypass every policy in migration 0006.
export function createUserClient(accessToken: string) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
