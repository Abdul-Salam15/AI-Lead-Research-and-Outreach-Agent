-- The lead-list-quality guide requires that when a run returns fewer than
-- target_qualified_leads, it does so "with a clear explanation." The
-- agent's final turn already produces that explanation as plain text, but
-- runAgent.ts previously discarded it (only total_cost_usd was read off the
-- SDK result message). This column persists it so the UI can show the
-- agent's own reasoning instead of a generic shortfall message.
alter table runs add column summary text;
