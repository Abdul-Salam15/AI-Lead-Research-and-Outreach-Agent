import { Router } from "express";
import { supabase } from "../lib/supabase";
import {
  OUTREACH_ITEMS,
  OutreachItem,
  checkRegenerateBudget,
  regenerateOutreachItem,
  setOutreachContent,
} from "../lib/regenerateOutreach";

const router = Router();

function isOutreachItem(value: string): value is OutreachItem {
  return (OUTREACH_ITEMS as readonly string[]).includes(value);
}

router.patch("/:leadId/outreach/:item", async (req, res) => {
  const { leadId, item } = req.params;
  const { content, provenance, note } = req.body ?? {};

  if (!isOutreachItem(item)) {
    return res.status(400).json({ error: `item must be one of ${OUTREACH_ITEMS.join(", ")}` });
  }
  if (provenance !== "manual" && provenance !== "regenerated") {
    return res.status(400).json({ error: "provenance must be 'manual' or 'regenerated'" });
  }
  if (content === undefined || content === null) {
    return res.status(400).json({ error: "content is required" });
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();

  if (leadError) {
    return res.status(500).json({ error: leadError.message });
  }
  if (!lead) {
    return res.status(404).json({ error: "Lead not found" });
  }

  const nextOutreach = setOutreachContent(lead.outreach, item, content, provenance, note);

  const { data: updated, error: updateError } = await supabase
    .from("leads")
    .update({ outreach: nextOutreach, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .select()
    .single();

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  res.json(updated);
});

router.post("/:leadId/outreach/:item/regenerate", async (req, res) => {
  const { leadId, item } = req.params;
  const { note } = req.body ?? {};

  if (!isOutreachItem(item)) {
    return res.status(400).json({ error: `item must be one of ${OUTREACH_ITEMS.join(", ")}` });
  }

  const budget = await checkRegenerateBudget(leadId);
  if (!budget.allowed) {
    return res.status(429).json({ remaining: 0, resetAt: budget.resetAt });
  }

  let proposed: unknown;
  try {
    proposed = await regenerateOutreachItem(leadId, item, note);
  } catch (err: any) {
    if (err?.message === "Lead not found") {
      return res.status(404).json({ error: "Lead not found" });
    }
    return res.status(500).json({ error: String(err?.message ?? err) });
  }

  res.json({ proposed, remaining: budget.remaining - 1, resetAt: budget.resetAt });
});

export default router;
