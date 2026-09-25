-- The run now pauses after ICP refinement so a human can review and edit
-- the ICP (hard filters, soft preferences, etc.) before company discovery
-- starts. "awaiting_confirmation" is that pause state: the agent has saved
-- an ICP via save_icp and stopped; the run resumes into discovery only once
-- POST /api/runs/:id/confirm-icp is called.
alter table runs drop constraint if exists runs_status_check;
alter table runs add constraint runs_status_check
  check (status in ('running','completed','failed','partial','stopped','awaiting_confirmation'));
