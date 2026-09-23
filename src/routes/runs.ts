import { Router } from "express";
import { supabase } from "../lib/supabase";
import { runAgent, stopRun } from "../agent/runAgent";

const router = Router();

router.post("/", async (req, res) => {
  const { objective, maxCandidates, maxScrapes, targetQualifiedLeads } = req.body ?? {};

  if (!objective || typeof objective !== "string") {
    return res.status(400).json({ error: "objective is required" });
  }

  const { data: run, error } = await supabase
    .from("runs")
    .insert({
      objective,
      max_candidates: maxCandidates ?? Number(process.env.MAX_CANDIDATES ?? 15),
      max_scrapes: maxScrapes ?? Number(process.env.MAX_SCRAPES ?? 20),
      max_turns: Number(process.env.MAX_TURNS ?? 40),
      target_qualified_leads: targetQualifiedLeads ?? Number(process.env.TARGET_QUALIFIED_LEADS ?? 10),
    })
    .select()
    .single();

  if (error || !run) {
    return res.status(500).json({ error: error?.message ?? "Failed to create run" });
  }

  // Fire-and-forget — the HTTP request returns immediately and the
  // frontend polls GET /api/runs/:id for progress.
  runAgent(run.id).catch((err) => {
    console.error(`runAgent(${run.id}) failed outside its own error handling:`, err);
  });

  res.json({ id: run.id });
});

router.get("/", async (_req, res) => {
  const { data, error } = await supabase
    .from("runs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

router.get("/:id", async (req, res) => {
  const { data, error } = await supabase
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
  const { data: run, error: runError } = await supabase
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

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("run_id", req.params.id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

router.post("/:id/stop", async (req, res) => {
  const { data: run, error } = await supabase
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
  const { data: run, error: runError } = await supabase
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

  const { data, error } = await supabase
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
