import "dotenv/config";
import express from "express";
import runsRouter from "./routes/runs";
import leadsRouter from "./routes/leads";

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.get("/health", (_req, res) => res.json({ ok: true }));
// The static frontend has no build step (no bundler, no env injection at
// build time — see implementation.md), so this is how it gets the
// (public-by-design) Supabase URL/anon key at runtime instead of a secret
// baked into a bundle. Unauthenticated on purpose: the anon key is meant
// to be public, RLS is what actually protects data.
app.get("/api/config", (_req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    // Lets the intake form prefill its "target qualified leads" input with
    // whatever this deployment is actually configured to default to,
    // instead of a client-side guess that could silently drift from it.
    defaultTargetQualifiedLeads: Number(process.env.TARGET_QUALIFIED_LEADS ?? 10),
  });
});
app.use("/api/runs", runsRouter);
app.use("/api/leads", leadsRouter);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Casefile listening on :${port}`));
