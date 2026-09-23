-- discovery_calibration.current_max_candidates now starts at 0 ("nothing
-- learned yet") instead of a guessed 2 — see src/lib/apify.ts for how the
-- app applies a minimal operational floor (1) only when a run actually
-- needs a working number, without mutating this stored state.
alter table discovery_calibration alter column current_max_candidates set default 0;
update discovery_calibration set current_max_candidates = 0 where id = 1;
