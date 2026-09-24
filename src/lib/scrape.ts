import "dotenv/config";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY!;

// scrape_website's URL comes from a company's self-reported LinkedIn
// "website" field — attacker-controllable (anyone can set up a LinkedIn
// company page with any website value) and reachable by an ordinary run if
// that page happens to match the search filters. Without this check, the
// agent could be steered into having this server fetch an internal/cloud
// address (a metadata endpoint, localhost, an internal service) and hand
// the response back into the model's context. This only checks the literal
// hostname/IP in the URL, not where it actually resolves to (no DNS-
// rebinding protection) — a deeper fix would resolve the hostname first
// and pin the fetch to that IP, which fetch() doesn't support directly.
const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0"]);

function isPrivateOrLoopbackIPv4([a, b]: [number, number, number, number]): boolean {
  if (a === 127) return true; // 127.0.0.0/8 — loopback
  if (a === 10) return true; // 10.0.0.0/8 — private
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 — private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 — private
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 — link-local (cloud metadata lives here)
  if (a === 0) return true; // 0.0.0.0/8
  return false;
}

function assertSafeToFetch(url: string): void {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Refusing to scrape non-http(s) URL: ${url}`);
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname === "::1") {
    throw new Error(`Refusing to scrape internal/loopback address: ${url}`);
  }

  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4 && isPrivateOrLoopbackIPv4([Number(ipv4[1]), Number(ipv4[2]), Number(ipv4[3]), Number(ipv4[4])])) {
    throw new Error(`Refusing to scrape internal/private address: ${url}`);
  }
}

// Fetches a URL's visible text via the Firecrawl REST API. If Firecrawl
// fails for any reason (network error, non-2xx response, missing content),
// falls back to a plain fetch of the page with basic HTML-to-text parsing —
// no headless browser, per this project's scraping decision.
export async function scrapeUrl(url: string): Promise<string> {
  assertSafeToFetch(url);

  try {
    const text = await scrapeViaFirecrawl(url);
    if (text) return text;
  } catch {
    // fall through to plain-fetch fallback
  }

  return scrapeViaPlainFetch(url);
}

async function scrapeViaFirecrawl(url: string): Promise<string | null> {
  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, formats: ["markdown"] }),
  });

  if (!response.ok) {
    throw new Error(`Firecrawl request failed: ${response.status}`);
  }

  const result = (await response.json()) as {
    success?: boolean;
    data?: { markdown?: string };
  };

  return result.data?.markdown ?? null;
}

async function scrapeViaPlainFetch(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Plain fetch failed for ${url}: ${response.status}`);
  }

  const html = await response.text();
  return htmlToVisibleText(html);
}

function htmlToVisibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
