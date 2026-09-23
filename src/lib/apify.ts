import "dotenv/config";
import { supabase } from "./supabase";

const APIFY_TOKEN = process.env.APIFY_TOKEN!;
const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID!;
const MAX_DISCOVERY_BUDGET_USD = Number(process.env.MAX_DISCOVERY_BUDGET_USD ?? 1);
const SAFETY_MARGIN = 2; // Appendix A's own "− safety margin" in the sizing formula
// The calibration STATE (discovery_calibration.current_max_candidates)
// genuinely starts at 0 — "nothing learned yet" — and is displayed that
// way. But an actual run can never use 0 as its real per-call limit: this
// code does items.slice(0, limit), so limit=0 always returns zero results,
// and zero results means updateDiscoveryCalibration has nothing to learn
// from (it early-returns on resultCount <= 0) — a permanent deadlock, never
// able to bootstrap itself. 1 is the smallest number that lets the system
// ever get real data at all, so it's applied only as an operational floor
// when a run actually needs a working number, never as the calibration
// state's own starting value.
const MIN_OPERATIONAL_CANDIDATES = 1;
// Appendix A's own practical ceiling ("a reasonable starting point... is
// somewhere in the 15-25 range") — capped regardless of how cheap the
// actor turns out to be. Budget affording more candidates doesn't mean
// discovering more is useful: the target is TARGET_QUALIFIED_LEADS (10),
// not "as many as fit the budget" — a very cheap actor's raw math
// (observed: $0.001/result -> budget/price of ~1000) would otherwise ramp
// this absurdly high.
const PRACTICAL_MAX_CANDIDATES_CEILING = 25;
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 60_000;

export interface DiscoveredCompany {
  name: string;
  domain: string;
  website?: string;
  linkedinUrl?: string;
  tagline?: string;
  description?: string;
  employeeCount?: unknown;
  employeeCountRange?: string;
  industries?: unknown;
  companyType?: string;
  foundedOn?: unknown;
  locations?: unknown;
}

export interface DiscoveryResult {
  items: DiscoveredCompany[];
  costUsd: number;
}

// Fields this actor's raw dataset items actually carry that are worth
// keeping for qualification — everything else (similarOrganizations,
// peopleStats, logos, backgroundCovers, affiliatedPages, _meta, etc.) is
// LinkedIn page-rendering data, not lead-qualification evidence. Measured
// against a real capture: similarOrganizations alone was 58% of a ~137KB
// result for just 8 companies — enough to blow past the Agent SDK's
// tool-result size limit and send the agent into a costly retry spiral
// trying random field names to shrink the response, without ever finding
// the real cause.
const KEEP_FIELDS = [
  "name", "website", "linkedinUrl", "tagline", "description",
  "employeeCount", "employeeCountRange", "industries", "companyType",
  "foundedOn", "locations",
] as const;

function domainFromWebsite(website: unknown): string {
  if (typeof website !== "string" || !website.trim()) return "";
  // new URL() throws on a bare hostname with no scheme (e.g. "www.foo.com"
  // instead of "https://www.foo.com") — a real, observed shape from this
  // actor — which silently produced an empty domain for a company that
  // really was found, undercounting companies_discovered.
  const withScheme = /^https?:\/\//i.test(website) ? website : `https://${website}`;
  try {
    return new URL(withScheme).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function trimCompany(raw: Record<string, unknown>): DiscoveredCompany {
  const trimmed: Record<string, unknown> = { domain: domainFromWebsite(raw.website) };
  for (const field of KEEP_FIELDS) {
    if (raw[field] !== undefined) trimmed[field] = raw[field];
  }
  if (typeof trimmed.description === "string" && trimmed.description.length > 500) {
    trimmed.description = trimmed.description.slice(0, 500) + "…";
  }
  return trimmed as DiscoveredCompany;
}

const TERMINAL_RUN_STATUSES = new Set(["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"]);

async function pollRunUntilFinished(runId: string): Promise<any> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const res = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
    if (!res.ok) {
      throw new Error(`Apify run status check failed: ${res.status} ${await res.text()}`);
    }
    const { data } = (await res.json()) as { data: any };
    if (TERMINAL_RUN_STATUSES.has(data.status)) return data;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`Apify run ${runId} did not finish within ${POLL_TIMEOUT_MS}ms`);
}

// Runs the pay-per-event company-discovery actor picked in Phase 0 (step 2)
// and returns its dataset items, trimmed to the fields above, plus the
// run's real cost. Uses the async run -> poll -> fetch-dataset flow rather
// than the simpler run-sync-get-dataset-items endpoint, because that sync
// endpoint returns only the dataset items — no run id, no billing info
// anywhere in its response (confirmed against Apify's own docs) — and real
// cost is required to self-calibrate MAX_CANDIDATES (see
// updateDiscoveryCalibration below). This also correctly attributes cost
// per call even when several discover_companies calls are in flight at
// once, since each gets its own run id.
//
// The actor's own input field names depend on which actor you picked in
// the Apify Console — check that actor's "Input" tab and adjust the body
// below (currently `searchQuery` / `maxItems`) if results come back empty.
//
// `limit` is enforced here in code (via `.slice`) regardless of whether the
// actor itself honors `maxItems`, so the cap can never be exceeded even if
// the actor's input schema uses a different field for it.
export async function discoverCompaniesViaApify(
  searchQuery: string,
  limit: number
): Promise<DiscoveryResult> {
  const startRes = await fetch(`https://api.apify.com/v2/actors/${APIFY_ACTOR_ID}/runs?token=${APIFY_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ searchQuery, maxItems: limit }),
  });
  if (!startRes.ok) {
    throw new Error(`Apify actor run failed to start: ${startRes.status} ${await startRes.text()}`);
  }
  const { data: startedRun } = (await startRes.json()) as { data: { id: string } };

  const finishedRun = await pollRunUntilFinished(startedRun.id);
  if (finishedRun.status !== "SUCCEEDED") {
    throw new Error(`Apify actor run ${startedRun.id} ended with status ${finishedRun.status}`);
  }

  const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${finishedRun.defaultDatasetId}/items?token=${APIFY_TOKEN}`);
  if (!itemsRes.ok) {
    throw new Error(`Apify dataset fetch failed: ${itemsRes.status} ${await itemsRes.text()}`);
  }
  const rawItems = (await itemsRes.json()) as Record<string, unknown>[];

  return {
    items: rawItems.slice(0, limit).map(trimCompany),
    costUsd: Number(finishedRun.usageTotalUsd ?? 0),
  };
}

// Feeds a real observed (cost, resultCount) pair into the running average
// and ramps discovery_calibration.current_max_candidates toward whatever a
// MAX_DISCOVERY_BUDGET_USD budget affords at that real price — doubling
// toward the target each time rather than jumping straight to it, so one
// noisy early observation can't swing the ceiling wildly. Never fails the
// caller: a calibration-write problem is logged, not thrown, since it must
// not take down the discover_companies tool call that triggered it.
export async function updateDiscoveryCalibration(costUsd: number, resultCount: number): Promise<void> {
  if (resultCount <= 0) return; // no price signal to learn from

  const { data: row, error: readError } = await supabase
    .from("discovery_calibration")
    .select("*")
    .eq("id", 1)
    .single();

  if (readError || !row) {
    console.error("updateDiscoveryCalibration: failed to read calibration row (has migration 0003 been run?):", readError?.message);
    return;
  }

  const totalCost = Number(row.total_cost_observed) + costUsd;
  const totalResults = row.total_results_observed + resultCount;
  const pricePerResult = totalCost / totalResults;
  const desired = Math.min(
    PRACTICAL_MAX_CANDIDATES_CEILING,
    Math.max(MIN_OPERATIONAL_CANDIDATES, Math.floor(MAX_DISCOVERY_BUDGET_USD / pricePerResult) - SAFETY_MARGIN)
  );
  // Math.max(MIN_OPERATIONAL_CANDIDATES, row.current_max_candidates) here is
  // purely to escape the 0 * 2 = 0 deadlock on the very first calibration
  // update ever (when the stored value is still genuinely 0) — it doesn't
  // stop the STORED value from having started at 0, only from being stuck
  // there once real data exists to learn from.
  const nextMax = Math.min(desired, Math.max(MIN_OPERATIONAL_CANDIDATES, row.current_max_candidates) * 2);

  const { error: writeError } = await supabase
    .from("discovery_calibration")
    .update({
      total_cost_observed: totalCost,
      total_results_observed: totalResults,
      current_max_candidates: nextMax,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (writeError) {
    console.error("updateDiscoveryCalibration: failed to write calibration row:", writeError.message);
  }
}

// The calibration state itself may genuinely be 0 (nothing learned yet, or
// the table/row doesn't exist because migration 0003 hasn't run) — but a
// real run always gets at least MIN_OPERATIONAL_CANDIDATES, since a run
// literally cannot discover anything with a 0 cap. This is the one place
// that floor gets applied; the stored calibration value is never mutated
// to enforce it.
export async function getCurrentMaxCandidates(): Promise<number> {
  const { data, error } = await supabase
    .from("discovery_calibration")
    .select("current_max_candidates")
    .eq("id", 1)
    .single();

  const raw = error || !data ? 0 : data.current_max_candidates;
  return Math.max(MIN_OPERATIONAL_CANDIDATES, raw);
}
