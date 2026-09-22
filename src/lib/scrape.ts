import "dotenv/config";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY!;

// Fetches a URL's visible text via the Firecrawl REST API. If Firecrawl
// fails for any reason (network error, non-2xx response, missing content),
// falls back to a plain fetch of the page with basic HTML-to-text parsing —
// no headless browser, per this project's scraping decision.
export async function scrapeUrl(url: string): Promise<string> {
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
