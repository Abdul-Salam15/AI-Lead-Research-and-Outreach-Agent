import { Router } from "express";
import { runAgent, stopRun } from "../agent/runAgent";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.use(requireAuth);

router.post("/", async (req, res) => {
  const { objective, maxCandidates, maxScrapes, targetQualifiedLeads } = req.body ?? {};

  if (!objective || typeof objective !== "string") {
    return res.status(400).json({ error: "objective is required" });
  }

  const resolvedTargetQualifiedLeads = targetQualifiedLeads ?? Number(process.env.TARGET_QUALIFIED_LEADS ?? 10);

  // max_candidates is the run-wide candidate target — how many distinct
  // companies this run should aim to accumulate in total (not the per-call
  // Apify request size, which is separately self-calibrated — see
  // src/agent/runAgent.ts / src/lib/apify.ts). Appendix A: "MAX_CANDIDATES
  // should be meaningfully higher than TARGET_QUALIFIED_LEADS" — 3x here.
  const resolvedMaxCandidates = maxCandidates ?? resolvedTargetQualifiedLeads * 3;

  const { data: run, error } = await req.supabaseUser!
    .from("runs")
    .insert({
      objective,
      max_candidates: resolvedMaxCandidates,
      max_scrapes: maxScrapes ?? Number(process.env.MAX_SCRAPES ?? 20),
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
  // frontend polls GET /api/runs/:id for progress. runAgent itself reads
  // and writes via the service-role client internally (it has no request
  // context to scope a client to), which is fine — RLS only needs to gate
  // the user-facing routes here, not the background agent's own access to
  // a run it was explicitly asked to process.
  runAgent(run.id).catch((err) => {
    console.error(`runAgent(${run.id}) failed outside its own error handling:`, err);
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
