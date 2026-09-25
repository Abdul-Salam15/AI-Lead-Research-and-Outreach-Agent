const COMPLIMENTARY_CLOSE = "Best regards,\nKoya Team";

// Every cold email should end the same way, regardless of how the model
// phrased its own sign-off (or didn't) — checked case-insensitively
// against the tail of the body so a model that already produced an
// equivalent close isn't given a second, duplicate one. Safe to call on
// the same body more than once (idempotent), which is what lets it also
// be used as a one-time backfill over already-saved leads, not just new
// drafts.
export function ensureComplimentaryClose(body: string): string {
  const trimmed = (body || "").trimEnd();
  const tail = trimmed.slice(-60).toLowerCase();
  if (tail.includes("koya team")) return trimmed;
  return `${trimmed}\n\n${COMPLIMENTARY_CLOSE}`;
}
