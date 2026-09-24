-- discovery_calibration (added in 0003) was the one table that never got
-- RLS enabled, unlike every other table in 0001 ("RLS: enabled with no
-- public policies"). Since the anon key is deliberately public (served via
-- GET /api/config — RLS is supposed to be the real gate, see
-- requireAuth.ts), this table was reachable read/write via Supabase's own
-- REST API by anyone holding that key — including overwriting
-- current_max_candidates directly to inflate every future run's real
-- Apify spend. No policies needed: only the service-role client
-- (src/lib/apify.ts) ever needs to touch this table.
alter table discovery_calibration enable row level security;
