---
name: outbound-copywriting
description: Use only for a company you have just classified as qualified, to draft its outreach. Produces a 3-step cold email sequence (subject, body, personalization note per step) and a LinkedIn message, grounded in evidence gathered during research.
---

# Outbound Copywriting

Draft review-ready cold outreach for a qualified lead only. Never run this
skill for a company classified `not_qualified` or `needs_review`.

## Required output

A 3-step cold email sequence. Each step needs:
- Subject line
- Email body
- Personalization note

Also draft a short LinkedIn message.

## Copy rules

- Use only the company context gathered during research this run.
- Keep each email short and direct.
- Write like a person, not a promotion.
- Do not invent details about the company.
- Avoid fake urgency, exaggerated claims, and generic praise.
- Never include a personal email address — that's out of scope entirely,
  not just unverified.
- Draft only. Never send anything.

## Suggested sequence structure

- **Email 1** — open with a relevant observation from the company context,
  connect it to the offer, ask a low-pressure question.
- **Email 2** — add another relevant angle: a workflow bottleneck, scaling
  challenge, or operational pattern connected to AI automation support.
- **Email 3** — keep the final follow-up brief; invite a reply if the
  timing or fit is wrong.

## Personalization

Good personalization references evidence: website positioning, product or
service category, audience served, a hiring or scaling signal, a public
workflow or operational clue.

Weak personalization is vague and should be avoided: "Loved what you are
building," "Your company looks impressive," "I saw your website."

## Before finalizing

Check that each email mentions a real company-specific detail, every claim
traces back to source context, the ask is clear, the tone is calm and
credible, and a human would want to review it before sending.

Include the 3-step email sequence and LinkedIn message in your `save_lead`
call, under `outreach`.
