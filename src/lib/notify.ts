import "dotenv/config";
import nodemailer from "nodemailer";
import { supabase } from "./supabase";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

interface RunSummary {
  id: string;
  objective: string;
  status: string;
  leads_qualified: number;
  target_qualified_leads: number;
  total_cost_usd: number | null;
  user_id: string | null;
}

function statusLine(run: RunSummary): string {
  const leadLine = `${run.leads_qualified}/${run.target_qualified_leads} leads qualified`;
  if (run.status === "completed") return `Finished — ${leadLine}.`;
  if (run.status === "partial") return `Finished short of target — ${leadLine}.`;
  if (run.status === "stopped") return `Stopped early — ${leadLine} so far.`;
  return `Failed — ${leadLine} so far.`;
}

// Fire-and-forget from the caller's perspective — a notification failure
// (bad credentials, Gmail rate limit, network blip) must never affect the
// run's own completion, which has already been written by the time this is
// called. Mirrors the same "log, don't throw" pattern src/lib/apify.ts
// already uses for updateDiscoveryCalibration, for the same reason.
export async function sendRunCompleteEmail(to: string, run: RunSummary): Promise<void> {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/#/run/${run.id}`;

  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject: `Casefile run finished: "${run.objective.slice(0, 60)}"`,
      text: [
        `Your Casefile run has finished.`,
        ``,
        `Objective: ${run.objective}`,
        statusLine(run),
        run.total_cost_usd != null ? `Cost: $${run.total_cost_usd.toFixed(2)}` : null,
        ``,
        `View results: ${link}`,
      ].filter((line) => line !== null).join("\n"),
    });
  } catch (err) {
    console.error(`sendRunCompleteEmail failed for run ${run.id}:`, err);
  }
}

// Looks up the run's owner (legacy pre-auth runs have no user_id and are
// skipped silently) and emails them — called from every terminal-state
// write in runAgent.ts (completed / partial / failed / stopped). Never
// throws: a lookup or send failure must not affect the run's own status,
// which has already been committed by the time this runs.
export async function notifyRunOwner(run: RunSummary): Promise<void> {
  if (!run.user_id) return;

  try {
    const { data, error } = await supabase.auth.admin.getUserById(run.user_id);
    if (error || !data.user?.email) {
      console.error(`notifyRunOwner: couldn't resolve email for user ${run.user_id}:`, error?.message);
      return;
    }
    await sendRunCompleteEmail(data.user.email, run);
  } catch (err) {
    console.error(`notifyRunOwner failed for run ${run.id}:`, err);
  }
}
