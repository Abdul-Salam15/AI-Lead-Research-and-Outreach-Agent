import { Router } from "express";
import { z } from "zod";
import { runIcpPhase, runDiscoveryPhase, stopRun } from "../agent/runAgent";
import { requireAuth } from "../middleware/requireAuth";
import { normalizeObjective, similarityScore } from "../lib/similarity";

const router = Router();

router.use(requireAuth);

// The objective is the only place the user states how many qualified leads
// they want (e.g. "Find 10 US B2B SaaS companies..."). Anchored to the
// start of the string so a number appearing later in the sentence (e.g.
// "10-100 employees") is never mistaken for the target count.
//
// public/app.js's objectiveTargetQualifiedLeads() mirrors this exact regex
// and bounds check to preview the count client-side (no build step in this
// app to share a module between browser and server) — keep both in sync if
// this ever changes, or the intake hint will show a number the server
// doesn't actually use.
const LEADING_FIND_COUNT = /^\s*find\s+(\d{1,3})\b/i;

function extractTargetQualifiedLeads(objective: string): number | null {
  const match = objective.match(LEADING_FIND_COUNT);
  if (!match) return null;
  const n = Number(match[1]);
  return n >= 1 && n <= 100 ? n : null;
}

router.post("/", async (req, res) => {
  const { objective } = req.body ?? {};

  if (!objective || typeof objective !== "string") {
    return res.status(400).json({ error: "objective is required" });
  }

  // Taken straight from the objective instead of a separate "how many"
  // input, but the meaning is unchanged from the original design: this is
  // the number of QUALIFIED leads the run is aiming for, not a search cap.
  const resolvedTargetQualifiedLeads = extractTargetQualifiedLeads(objective) ?? Number(process.env.TARGET_QUALIFIED_LEADS ?? 10);

  // max_candidates is the run-wide candidate target — how many distinct
  // companies this run should aim to accumulate in total (not the per-call
  // Apify request size, which is separately self-calibrated — see
  // src/agent/runAgent.ts / src/lib/apify.ts). Appendix A: "MAX_CANDIDATES
  // should be meaningfully higher than TARGET_QUALIFIED_LEADS" — 3x here,
  // since not every discovered company will end up qualifying.
  const resolvedMaxCandidates = resolvedTargetQualifiedLeads * 3;

  // Every discovered candidate needs a scrape to actually be evaluated —
  // a flat default here regardless of resolvedMaxCandidates meant a run
  // could out-discover its own scrape budget (observed: target=9 ->
  // max_candidates=27, but MAX_SCRAPES defaulted to a flat 20, so even a
  // fully successful discovery phase could never get more than 20
  // candidates scraped and qualified). MAX_SCRAPES, if a deployer sets it
  // explicitly, still acts as a hard ceiling on top of that — e.g. to cap
  // real Firecrawl spend for an unusually large requested target — it's
  // just no longer the default itself.
  const resolvedMaxScrapes = Math.min(resolvedMaxCandidates, Number(process.env.MAX_SCRAPES ?? resolvedMaxCandidates));

  const { data: run, error } = await req.supabaseUser!
    .from("runs")
    .insert({
      objective,
      max_candidates: resolvedMaxCandidates,
      max_scrapes: resolvedMaxScrapes,
      max_turns: Number(process.env.MAX_TURNS ?? 40),
      target_qualified_leads: resolvedTargetQualifiedLeads,
      user_id: req.user!.id,
    })
    .select()
    .single();

  if (error || !run) {
    return res.status(500).json({ error: error?.message ?? "Failed to create run" });
  }

  // Fire-and-forget — the HTTP request returns immediately and the
  // frontend polls GET /api/runs/:id for progress. runIcpPhase itself reads
  // and writes via the service-role client internally (it has no request
  // context to scope a client to), which is fine — RLS only needs to gate
  // the user-facing routes here, not the background agent's own access to
  // a run it was explicitly asked to process. It only refines the ICP and
  // stops at "awaiting_confirmation" — POST /:id/confirm-icp below is what
  // continues the run into discovery.
  runIcpPhase(run.id).catch((err) => {
    console.error(`runIcpPhase(${run.id}) failed outside its own error handling:`, err);
  });

  res.json({ id: run.id });
});

router.get("/", async (req, res) => {
  const { data, error } = await req.supabaseUser!
    .from("runs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

const SIMILARITY_THRESHOLD = 0.6; // same threshold the "string-similarity" library treats as a reasonable match
const MAX_SIMILAR_MATCHES = 3;

// Checked from the intake screen before a new run is created, so the user
// can be warned "a similar search already exists" and go look at it instead
// of unknowingly re-running (and re-paying for) the same research. Scoped
// to the caller's own runs via req.supabaseUser (RLS) — this never compares
// against or reveals another user's search objectives, only the caller's
// own run history, same as every other route in this file.
//
// Registered before GET /:id so "/similar" isn't swallowed by that route's
// :id param match.
router.get("/similar", async (req, res) => {
  const objective = typeof req.query.objective === "string" ? req.query.objective : "";
  if (!objective.trim()) {
    return res.json({ matches: [] });
  }

  // Capped rather than unbounded — this run's own history is what's being
  // compared against, and a similarity pass over it should stay cheap
  // regardless of how long that history gets.
  const { data, error } = await req.supabaseUser!
    .from("runs")
    .select("id, objective, status, created_at, leads_qualified, target_qualified_leads")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const normalizedNew = normalizeObjective(objective);
  const matches = (data ?? [])
    .map((run) => ({ ...run, similarity: similarityScore(objective, run.objective) }))
    .filter((run) => run.similarity >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, MAX_SIMILAR_MATCHES)
    .map((run) => ({ ...run, identical: normalizeObjective(run.objective) === normalizedNew }));

  res.json({ matches });
});

router.get("/:id", async (req, res) => {
  const { data, error } = await req.supabaseUser!
    .from("runs")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  if (!data) {
    return res.status(404).json({ error: "Run not found" });
  }

  res.json(data);
});

// Matches save_icp's own zod schema in src/agent/tools.ts — this is the
// same shape, just validated again here since it's now also an
// externally-editable payload (a human can add/remove/rewrite any of these
// fields from the review screen before confirming).
const icpCriteriaSchema = z.object({
  target_company_type: z.string(),
  industries: z.array(z.string()),
  geography: z.array(z.string()),
  headcount_range: z.string(),
  buyer_persona: z.string(),
  business_problem: z.string(),
  hard_filters: z.array(z.string()),
  soft_preferences: z.array(z.string()),
  disqualifiers: z.array(z.string()),
  assumptions_made: z.array(z.string()).optional(),
});

// Confirms (and, when the human edited it, overwrites) the ICP a run's
// phase 1 saved, then kicks off phase 2 (discovery through outreach
// drafting) — see runIcpPhase/runDiscoveryPhase in src/agent/runAgent.ts.
// Only valid from "awaiting_confirmation"; the .eq("status", ...) below
// double-checks that atomically against a race (e.g. a double-click).
router.post("/:id/confirm-icp", async (req, res) => {
  const parsed = icpCriteriaSchema.safeParse(req.body?.icp_criteria);
  if (!parsed.success) {
    return res.status(400).json({ error: "icp_criteria is missing or invalid", details: parsed.error.flatten() });
  }

  const { data: run, error: runError } = await req.supabaseUser!
    .from("runs")
    .select("status")
    .eq("id", req.params.id)
    .maybeSingle();

  if (runError) {
    return res.status(500).json({ error: runError.message });
  }
  if (!run) {
    return res.status(404).json({ error: "Run not found" });
  }
  if (run.status !== "awaiting_confirmation") {
    return res.status(409).json({ error: `Run is not awaiting ICP confirmation (status: ${run.status})` });
  }

  const { data: updatedRun, error } = await req.supabaseUser!
    .from("runs")
    .update({ icp_criteria: parsed.data, status: "running" })
    .eq("id", req.params.id)
    .eq("status", "awaiting_confirmation")
    .select()
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  if (!updatedRun) {
    return res.status(409).json({ error: "Run is no longer awaiting ICP confirmation." });
  }

  // Fire-and-forget, same pattern as the initial POST / — the frontend goes
  // back to polling GET /api/runs/:id for progress.
  runDiscoveryPhase(updatedRun.id).catch((err) => {
    console.error(`runDiscoveryPhase(${updatedRun.id}) failed outside its own error handling:`, err);
  });

  res.json(updatedRun);
});

router.get("/:id/leads", async (req, res) => {
  const { data: run, error: runError } = await req.supabaseUser!
    .from("runs")
    .select("id")
    .eq("id", req.params.id)
    .maybeSingle();

  if (runError) {
    return res.status(500).json({ error: runError.message });
  }
  if (!run) {
    return res.status(404).json({ error: "Run not found" });
  }

  const { data, error } = await req.supabaseUser!
    .from("leads")
    .select("*")
    .eq("run_id", req.params.id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

router.post("/:id/stop", async (req, res) => {
  const { data: run, error } = await req.supabaseUser!
    .from("runs")
    .select("status")
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  if (!run) {
    return res.status(404).json({ error: "Run not found" });
  }
  if (run.status !== "running") {
    return res.status(409).json({ error: `Run is not running (status: ${run.status})` });
  }

  const stopped = await stopRun(req.params.id);
  if (!stopped) {
    return res.status(409).json({
      error: "Run is not actively tracked on this server — it may have already finished, or the server restarted since it started.",
    });
  }

  res.json({ ok: true });
});

router.get("/:id/tool-calls", async (req, res) => {
  const { data: run, error: runError } = await req.supabaseUser!
    .from("runs")
    .select("id")
    .eq("id", req.params.id)
    .maybeSingle();

  if (runError) {
    return res.status(500).json({ error: runError.message });
  }
  if (!run) {
    return res.status(404).json({ error: "Run not found" });
  }

  const { data, error } = await req.supabaseUser!
    .from("tool_calls")
    .select("*")
    .eq("run_id", req.params.id)
    .order("created_at", { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

export default router;
