-- One-time cleanup of duplicate lead rows created by the agent calling
-- save_lead twice for the same company (once before drafting outreach,
-- once after) — src/agent/tools.ts's save_lead now checks for an existing
-- row before inserting, so this won't recur, but historical duplicates
-- need cleaning up once.
--
-- Keeps the most recently created row per (run_id, company_domain) and
-- drops the earlier one(s). Only touches rows with a real (non-empty)
-- company_domain: a handful of real leads have no domain at all (Apify
-- returned no website for them) and are genuinely different companies
-- that happen to share an empty string — they must not be merged.
delete from leads a using leads b
where a.run_id = b.run_id
  and a.company_domain = b.company_domain
  and a.company_domain <> ''
  and a.id <> b.id
  and a.created_at < b.created_at;
