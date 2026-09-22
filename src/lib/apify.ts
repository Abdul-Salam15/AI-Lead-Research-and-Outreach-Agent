import "dotenv/config";

const APIFY_TOKEN = process.env.APIFY_TOKEN!;
const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID!;

export interface DiscoveredCompany {
  name: string;
  domain: string;
  [key: string]: unknown;
}

// Runs the pay-per-event company-discovery actor picked in Phase 0 (step 2)
// synchronously and returns its dataset items. The actor's own input field
// names depend on which actor you picked in the Apify Console — check that
// actor's "Input" tab and adjust the body below (currently `searchQuery` /
// `maxItems`) to match its actual input schema if results come back empty.
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

  const items = (await response.json()) as DiscoveredCompany[];
  return items.slice(0, limit);
}
