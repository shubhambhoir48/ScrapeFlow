const { chromium } = require("playwright");
const cheerio = require("cheerio");

async function harvestProductPathways() {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  console.log("=== HARVESTING PRODUCT PATHWAYS FROM MAHARASHTRA DIRECTORY ===");
  
  // Method A: Check /Category (Browse All Categories)
  console.log("Navigating to https://www.maharashtradirectory.com/Category...");
  await page.goto("https://www.maharashtradirectory.com/Category", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  
  const catHtml = await page.content();
  const $cat = cheerio.load(catHtml);
  
  const categoryLinks = [];
  $cat('a[href*="/category/"]').each((_, el) => {
    const h = $cat(el).attr("href");
    if (h && h.endsWith(".html")) {
      const full = h.startsWith("http") ? h : new URL(h, "https://www.maharashtradirectory.com/").toString();
      if (!categoryLinks.includes(full)) categoryLinks.push(full);
    }
  });

  console.log(`Found ${categoryLinks.length} category links on /Category page.`);
  console.log("Sample category links:", categoryLinks.slice(0, 5));

  // Method B: Check Alphabetical Index (e.g. /product/alpha/A.html through Z.html)
  const letters = ["M", "P", "C", "A", "H", "S", "B", "T"];
  const allProductUrls = [];

  for (const letter of letters) {
    const alphaUrl = `https://www.maharashtradirectory.com/product/alpha/${letter}.html`;
    console.log(`Checking alpha index: ${alphaUrl}...`);
    try {
      await page.goto(alphaUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(1000);
      const alphaHtml = await page.content();
      const $a = cheerio.load(alphaHtml);

      $a('a[href*="/product/"]').each((_, el) => {
        const h = $a(el).attr("href");
        if (h && h.endsWith(".html") && !h.includes("/alpha/")) {
          const full = h.startsWith("http") ? h : new URL(h, alphaUrl).toString();
          if (!allProductUrls.includes(full)) {
            allProductUrls.push(full);
          }
        }
      });
      console.log(`  -> Harvested ${allProductUrls.length} total product pathways so far.`);
    } catch (e) {
      console.error(`  Error on ${alphaUrl}:`, e.message);
    }
  }

  console.log(`\nTOTAL UNIQUE PRODUCT PATHWAYS HARVESTED: ${allProductUrls.length}`);
  console.log("Sample 10 Product Listing URLs:\n", allProductUrls.slice(0, 10));

  await browser.close();
}

harvestProductPathways().catch(console.error);

