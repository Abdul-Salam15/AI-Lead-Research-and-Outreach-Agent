import "dotenv/config";
import express from "express";
import runsRouter from "./routes/runs";
// leadsRouter is mounted once src/routes/leads.ts is actually built (next stage) —
// importing it now would crash the server, since it currently has no default export.

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/runs", runsRouter);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Casefile listening on :${port}`));
