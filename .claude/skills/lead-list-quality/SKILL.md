---
name: lead-list-quality
description: Use near the end of a run, after all candidates have been qualified and saved, as a self-check before finishing. Confirms the lead list is complete, deduplicated, evidence-backed, and safe before the run reports completed.
---

# Lead-List Quality

Run this self-check before ending the run — after every candidate has been
qualified and saved via `save_lead`, not before.

## Required checks

- Each company has a name and domain.
- Each company has qualification reasoning (`fit_reasons`/`concerns`).
- Each company has source context (`source_urls`, `source_summary`).
- Qualified companies have outreach drafts; non-qualified ones do not need
  them.
- No personal email finding or email validation was attempted anywhere in
  the run.
- No duplicate companies remain in the list.
- Companies marked `needs_review` are not being counted toward the
  qualified total.

## Scorecard to reason through

| Dimension | What to check |
|---|---|
| ICP fit | The lead matches the hard filters from the ICP object. |
| Evidence quality | The qualification decision uses real source context, not guesses. |
| Duplicate rate | The same company does not appear more than once. |
| Outreach relevance | The email sequence uses company-specific context. |
| Data completeness | Every required field was actually saved, not left blank. |
| Safety compliance | No email finding, validation, or sending occurred. |

## Pass standard

The list should reach the target number of qualified companies for this
run and pass the checks above. If the candidate pool doesn't produce
enough qualified companies within the run's tool-call limits, it is
correct to stop and report fewer leads with a clear explanation rather
than searching further once limits are hit, and it is never correct to
lower the qualification bar to hit the number.
