create extension if not exists "pgcrypto";

create table runs (
  id                      uuid primary key default gen_random_uuid(),
  objective               text not null,
  icp_criteria            jsonb,
  max_candidates          int not null,
  max_scrapes             int not null,
  max_turns               int not null,
  target_qualified_leads  int not null,
  status                  text not null default 'running'
                            check (status in ('running','completed','failed','partial')),
  companies_discovered    int not null default 0,
  sites_scraped           int not null default 0,
  leads_qualified         int not null default 0,
  total_cost_usd          numeric(10,4),
  error_message           text,
  created_at              timestamptz not null default now(),
  completed_at            timestamptz
);

create table leads (
  id                      uuid primary key default gen_random_uuid(),
  run_id                  uuid not null references runs(id) on delete cascade,
  company_name            text not null,
  company_domain          text not null,
  qualification_status    text not null
                            check (qualification_status in ('qualified','not_qualified','needs_review')),
  confidence              numeric(3,2),
  fit_reasons             jsonb not null default '[]',
  concerns                jsonb not null default '[]',
  source_urls             jsonb not null default '[]',
  source_summary          text,
  -- outreach shape: { emails: [{subject, body, personalization_note, provenance, note}] (x3),
  --                   linkedin: {message, provenance, note} }
  outreach                jsonb not null default '{}',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table tool_calls (
  id                      uuid primary key default gen_random_uuid(),
  run_id                  uuid not null references runs(id) on delete cascade,
  tool_name               text not null,
  purpose                 text,
  input_summary           text,
  result_summary          text,
  status                  text not null check (status in ('success','error','blocked')),
  error_message           text,
  created_at              timestamptz not null default now()
);

-- Powers the "3 regenerations per 30 minutes, per lead" limit and doubles as an audit trail.
create table outreach_regenerations (
  id                      uuid primary key default gen_random_uuid(),
  lead_id                 uuid not null references leads(id) on delete cascade,
  outreach_item           text not null check (outreach_item in ('email_1','email_2','email_3','linkedin')),
  note                    text,
  created_at              timestamptz not null default now()
);

create index on leads (run_id);
create index on tool_calls (run_id);
create index on outreach_regenerations (lead_id, created_at);

-- RLS: enabled with no public policies. Only the backend's service-role key
-- (which bypasses RLS) ever touches these tables — there is no client-side
-- Supabase access in this app, so no policies are needed yet.
alter table runs enable row level security;
alter table leads enable row level security;
alter table tool_calls enable row level security;
alter table outreach_regenerations enable row level security;
