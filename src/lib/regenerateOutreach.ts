import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "./supabase";

const anthropic = new Anthropic();
const REGENERATE_LIMIT = Number(process.env.REGENERATE_LIMIT ?? 3);
const WINDOW_MINUTES = Number(process.env.REGENERATE_WINDOW_MINUTES ?? 30);

export const OUTREACH_ITEMS = ["email_1", "email_2", "email_3", "linkedin"] as const;
export type OutreachItem = (typeof OUTREACH_ITEMS)[number];

const EMAIL_INDEX: Record<string, number> = { email_1: 0, email_2: 1, email_3: 2 };

// outreach is stored exactly as src/agent/tools.ts's save_lead writes it:
// { emails: [{subject, body, personalization_note}, x3], linkedin_message: string }.
// There are no keys literally named "email_1"/"email_2"/"email_3"/"linkedin", so both
// reading the current draft (here) and writing a new one (leads.ts) go through this
// mapping instead of indexing outreach[item] directly.
export function getOutreachContent(outreach: any, item: OutreachItem): unknown {
  if (item === "linkedin") return outreach?.linkedin_message;
  return outreach?.emails?.[EMAIL_INDEX[item]];
}

export function setOutreachContent(
  outreach: any,
  item: OutreachItem,
  content: unknown,
  provenance: "manual" | "regenerated",
  note?: string
) {
  const next = { ...(outreach ?? {}) };

  if (item === "linkedin") {
    next.linkedin_message = content;
  } else {
    const emails = Array.isArray(next.emails) ? [...next.emails] : [undefined, undefined, undefined];
    emails[EMAIL_INDEX[item]] = content;
    next.emails = emails;
  }

  // provenance/note aren't part of tools.ts's save_lead shape (agent drafts carry
  // neither), so they're tracked in a parallel per-item map rather than forcing
  // linkedin_message to switch from a string to an object once touched.
  next.meta = { ...(next.meta ?? {}), [item]: { provenance, note: note ?? null, updated_at: new Date().toISOString() } };

  return next;
}

export async function checkRegenerateBudget(leadId: string) {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
  const { data: rows, count } = await supabase
    .from("outreach_regenerations")
    .select("created_at", { count: "exact" })
    .eq("lead_id", leadId)
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const used = count ?? 0;
  const remaining = Math.max(0, REGENERATE_LIMIT - used);
  const oldest = rows?.[0]?.created_at;
  const resetAt = oldest
    ? new Date(new Date(oldest).getTime() + WINDOW_MINUTES * 60 * 1000).toISOString()
    : null;

  return { remaining, allowed: remaining > 0, resetAt };
}

export async function regenerateOutreachItem(leadId: string, item: string, note?: string) {
  const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).single();
  if (!lead) throw new Error("Lead not found");

  const current = getOutreachContent(lead.outreach, item as OutreachItem);

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001", // cheap and fast — this is a constrained rewrite, not research
    max_tokens: 600,
    system:
      "Rewrite outbound cold-outreach copy using ONLY the evidence provided. " +
      "Never invent new facts about the company. Keep it short, direct, and " +
      "written like a person, not a promotion. Your entire response must be " +
      "ONLY the rewritten replacement for current_draft — the same JSON " +
      "shape as current_draft itself (an object with the same keys if " +
      "current_draft is an object, or a bare JSON string if current_draft " +
      "is a string). Do not repeat company_context, current_draft, or " +
      "requested_change in your output. Do not wrap the output in markdown " +
      "code fences or add any commentary before or after it.",
    messages: [{
      role: "user",
      content: JSON.stringify({
        company_context: {
          fit_reasons: lead.fit_reasons,
          source_summary: lead.source_summary,
        },
        current_draft: current,
        requested_change: note || "General improvement — sharper and more specific.",
      }),
    }],
  });

  const block = response.content.find((b: any) => b.type === "text") as any;
  // Haiku (like most models) routinely wraps JSON in a ```json ... ``` fence
  // despite being told not to — strip that before parsing.
  const rawText = (block?.text ?? "{}").trim();
  const unfenced = rawText.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const proposed = JSON.parse(unfenced); // throws on unparseable output — see below

  // IMPORTANT: this call counts against the budget whether or not the user
  // ultimately applies the result — the cost was already incurred. But it
  // must only count once we actually have a usable proposal: inserting
  // before the parse above would burn budget on a response the caller never
  // gets to see, which is exactly the "failed attempt" case this budget is
  // supposed to protect against.
  await supabase.from("outreach_regenerations").insert({ lead_id: leadId, outreach_item: item, note });

  return proposed; // the PROPOSED draft — caller decides whether to PATCH it in
}
