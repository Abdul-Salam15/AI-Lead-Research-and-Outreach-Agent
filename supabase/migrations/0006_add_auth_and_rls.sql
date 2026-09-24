-- Turns Casefile from a single-user internal tool into a real multi-user
-- product: every run gets an owning user (Supabase Auth), and Postgres RLS
-- — not just application-level filtering — is what actually keeps one
-- user's runs/leads invisible to everyone else.
--
-- Existing rows (created before this migration) have user_id = null and
-- become invisible under the policies below until manually claimed — see
-- the one-line "update runs set user_id = ..." snippet given separately,
-- since it needs a real auth.uid() this migration can't know in advance.

alter table runs add column user_id uuid references auth.users(id) on delete cascade;

create index on runs (user_id);

-- runs: a user can only see/create/update their own rows.
create policy "runs_select_own" on runs
  for select to authenticated
  using (user_id = auth.uid());

create policy "runs_insert_own" on runs
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "runs_update_own" on runs
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- leads: no user_id of its own — ownership flows through runs.run_id.
create policy "leads_select_own" on leads
  for select to authenticated
  using (exists (
    select 1 from runs where runs.id = leads.run_id and runs.user_id = auth.uid()
  ));

create policy "leads_update_own" on leads
  for update to authenticated
  using (exists (
    select 1 from runs where runs.id = leads.run_id and runs.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from runs where runs.id = leads.run_id and runs.user_id = auth.uid()
  ));

-- tool_calls: read-only audit log from the user's perspective — no update/insert policy needed.
create policy "tool_calls_select_own" on tool_calls
  for select to authenticated
  using (exists (
    select 1 from runs where runs.id = tool_calls.run_id and runs.user_id = auth.uid()
  ));

-- outreach_regenerations: ownership flows through leads.run_id -> runs.user_id.
create policy "outreach_regenerations_select_own" on outreach_regenerations
  for select to authenticated
  using (exists (
    select 1 from leads
    join runs on runs.id = leads.run_id
    where leads.id = outreach_regenerations.lead_id and runs.user_id = auth.uid()
  ));
