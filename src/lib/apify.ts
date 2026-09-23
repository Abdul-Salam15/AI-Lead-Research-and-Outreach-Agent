import "dotenv/config";

const APIFY_TOKEN = process.env.APIFY_TOKEN!;
const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID!;

export interface DiscoveredCompany {
  name: string;
  domain: string;
  website?: string;
  linkedinUrl?: string;
  tagline?: string;
  description?: string;
  employeeCount?: unknown;
  employeeCountRange?: string;
  industries?: unknown;
  companyType?: string;
  foundedOn?: unknown;
  locations?: unknown;
}

// Fields this actor's raw dataset items actually carry that are worth
// keeping for qualification — everything else (similarOrganizations,
// peopleStats, logos, backgroundCovers, affiliatedPages, _meta, etc.) is
// LinkedIn page-rendering data, not lead-qualification evidence. Measured
// against a real capture: similarOrganizations alone was 58% of a ~137KB
// result for just 8 companies — enough to blow past the Agent SDK's
// tool-result size limit and send the agent into a costly retry spiral
// trying random field names to shrink the response, without ever finding
// the real cause.
const KEEP_FIELDS = [
  "name", "website", "linkedinUrl", "tagline", "description",
  "employeeCount", "employeeCountRange", "industries", "companyType",
  "foundedOn", "locations",
] as const;

function domainFromWebsite(website: unknown): string {
  if (typeof website !== "string" || !website) return "";
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function trimCompany(raw: Record<string, unknown>): DiscoveredCompany {
  const trimmed: Record<string, unknown> = { domain: domainFromWebsite(raw.website) };
  for (const field of KEEP_FIELDS) {
    if (raw[field] !== undefined) trimmed[field] = raw[field];
  }
  if (typeof trimmed.description === "string" && trimmed.description.length > 500) {
    trimmed.description = trimmed.description.slice(0, 500) + "…";
  }
  return trimmed as DiscoveredCompany;
}

// Runs the pay-per-event company-discovery actor picked in Phase 0 (step 2)
// synchronously and returns its dataset items, trimmed to the fields above.
// The actor's own input field names depend on which actor you picked in the
// Apify Console — check that actor's "Input" tab and adjust the body below
// (currently `searchQuery` / `maxItems`) to match its actual input schema
// if results come back empty.
//
// `limit` is enforced here in code (via `.slice`) regardless of whether the
// actor itself honors `maxItems`, so the cap can never be exceeded even if
// the actor's input schema uses a different field for it.
export async function discoverCompaniesViaApify(
  searchQuery: string,
  limit: number
): Promise<DiscoveredCompany[]> {
  const url = `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      searchQuery,
      maxItems: limit,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Apify actor run failed: ${response.status} ${await response.text()}`
    );
  }

  const items = (await response.json()) as Record<string, unknown>[];
  return items.slice(0, limit).map(trimCompany);
}
