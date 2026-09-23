-- Adds "stopped" as a distinct run status, for a user-initiated stop —
-- separate from "partial" (which means the agent finished on its own but
-- fell short of the qualified-lead target) and "failed" (an actual error).
alter table runs drop constraint if exists runs_status_check;
alter table runs add constraint runs_status_check
  check (status in ('running','completed','failed','partial','stopped'));
