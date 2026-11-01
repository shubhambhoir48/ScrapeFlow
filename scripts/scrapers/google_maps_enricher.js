/**
 * Google Maps Local Business & Unmasked Phone Extractor
 * Usage: node scripts/scrapers/google_maps_enricher.js "Farohar Engineering Ambernath"
 */
const { chromium } = require("playwright");

async function extractFromMaps(query) {
  if (!query) {
    console.error("Usage: node google_maps_enricher.js <Query>");
    process.exit(1);
  }

  console.log(`[Google Maps Micro-Scraper] Query: "${query}"`);
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--headless=new", "--disable-blink-features=AutomationControlled"],
  });

  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    await page.goto("https://www.google.com/maps/search/" + encodeURIComponent(query), {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await page.waitForTimeout(3000);

    const result = await page.evaluate(() => {
      const text = document.body.innerText;
      // Extract phone
      const phoneRegex = /(?:\+91[-\s]?)?(?:0?[1-9]\d{1,4}[-\s]?)?\d{6,10}/g;
      const phones = text.match(phoneRegex) || [];
      const cleanPhones = phones.filter((p) => {
        const d = p.replace(/\D/g, "");
        return d.length >= 8 && d.length <= 13;
      });

      // Extract rating
      const ratingMatch = text.match(/\b([1-5]\.[0-9])\b/);

      // Extract external website
      const anchors = Array.from(document.querySelectorAll("a[href]")).map((a) => a.href);
      const websites = anchors.filter(
        (h) => h.startsWith("http") && !h.includes("google.") && !h.includes("gstatic.")
      );

      return {
        phones: Array.from(new Set(cleanPhones)),
        rating: ratingMatch ? ratingMatch[1] : null,
        websites: websites.slice(0, 3),
        snippet: text.slice(0, 1000),
      };
    });

    console.log("\n--- EXTRACTED MAPS INTELLIGENCE ---");
    console.log("Unmasked Phone:", result.phones[0] || "None");
    console.log("Alternate Phones:", result.phones.slice(1));
    console.log("Google Rating:", result.rating || "None");
    console.log("Official Website / Domain:", result.websites[0] || "None");
    return result;
  } finally {
    await browser.close();
  }
}

const targetQuery = process.argv[2] || "Farohar Engineering Ambernath";
extractFromMaps(targetQuery).catch(console.error);

