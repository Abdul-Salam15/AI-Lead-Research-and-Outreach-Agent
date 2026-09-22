---
name: icp-refinement
description: Use at the start of a run to turn the user's qualification objective into structured ICP criteria, before any company search happens. Produces target company type, industries, geography, headcount range, buyer persona, business problem, hard filters, soft preferences, and disqualifiers.
---

# ICP Refinement

Turn the qualification objective into concrete ICP criteria before spending
any tool calls on discovery or scraping. The agent should know who counts
as a good-fit company before it searches for one.

Cover these fields:
- Target company type
- Industry or niche
- Geography
- Company size or headcount range
- Relevant buyer or operator persona
- Business problem the company may have
- Hard disqualifiers
- Soft preferences

## Hard filters vs. soft preferences

Hard filters must be true for a lead to qualify — e.g. country must be
United States, company must be B2B, headcount must be between 10 and 100.
Do not treat every stated preference as a hard filter.

Soft preferences improve fit but should never by themselves disqualify a
company — e.g. recently hiring operations roles, uses tools that may
connect to automation workflows, publishes content about scaling
operations.

## When the objective is vague

This run has no mid-run channel back to the user — it is fire-and-forget
once started, so you cannot pause to ask a clarifying question. If the
objective is too vague to search on directly, make the most reasonable
assumption for each missing field yourself and record every assumption you
made in an `assumptions_made` array on the ICP object. Do not halt the run
and do not leave a field empty for lack of information — infer a sensible
default and disclose it.

## Rules

- Preserve every specific constraint the user actually gave — never loosen
  a constraint they stated explicitly.
- Keep the ICP narrow enough to search, but not so narrow the agent finds
  no candidates at all.
- Record inferred fields in `assumptions_made`; record user-stated fields
  without adding them there.

When refinement is complete, call the `save_icp` tool with your structured
ICP object, including `assumptions_made` whenever you inferred anything.
