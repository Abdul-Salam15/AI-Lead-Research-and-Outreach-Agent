// Dice's coefficient over character bigrams — a small, dependency-free way
// to catch a reworded-but-essentially-the-same objective (e.g. "Find 10 US
// B2B SaaS companies..." vs "Find 15 US B2B SaaS firms...") without an LLM
// call on every run creation. 1.0 = identical after normalization, 0.0 = no
// shared bigrams at all. This is the same algorithm the popular
// "string-similarity" npm package uses.

// Strips the leading "Find N" count and punctuation before comparing — two
// objectives asking for a different NUMBER of the same companies are still
// the same underlying search, and punctuation differences shouldn't matter.
export function normalizeObjective(objective: string): string {
  return objective
    .toLowerCase()
    .replace(/^\s*find\s+\d{1,3}\b/, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(s: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
  return out;
}

export function similarityScore(a: string, b: string): number {
  const na = normalizeObjective(a);
  const nb = normalizeObjective(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const bigramsA = bigrams(na);
  const bigramsB = bigrams(nb);
  if (bigramsA.length === 0 || bigramsB.length === 0) return 0;

  const remaining = new Map<string, number>();
  for (const bg of bigramsA) remaining.set(bg, (remaining.get(bg) ?? 0) + 1);

  let matches = 0;
  for (const bg of bigramsB) {
    const count = remaining.get(bg) ?? 0;
    if (count > 0) {
      matches++;
      remaining.set(bg, count - 1);
    }
  }

  return (2 * matches) / (bigramsA.length + bigramsB.length);
}
