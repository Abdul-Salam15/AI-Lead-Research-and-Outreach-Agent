-- Single-row table (single-user tool, no per-user keying needed) that lets
-- MAX_CANDIDATES self-calibrate from real observed Apify cost instead of a
-- guessed static number. total_cost_observed/total_results_observed are
-- running totals (not a pre-averaged rate) so price-per-result is always
-- total_cost_observed / total_results_observed — a true weighted average,
-- not skewed by any single noisy call.
create table discovery_calibration (
  id                      int primary key default 1,
  total_cost_observed     numeric(10,4) not null default 0,
  total_results_observed  int not null default 0,
  current_max_candidates  int not null default 2,
  updated_at              timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into discovery_calibration (id) values (1);
