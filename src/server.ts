import "dotenv/config";
import express from "express";
import runsRouter from "./routes/runs";
import leadsRouter from "./routes/leads";

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/runs", runsRouter);
app.use("/api/leads", leadsRouter);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Casefile listening on :${port}`));
