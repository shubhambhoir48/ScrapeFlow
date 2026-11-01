const { chromium } = require("playwright");
const cheerio = require("cheerio");

(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  console.log("Navigating to M alpha page...");
  await page.goto("https://www.maharashtradirectory.com/product/alpha/M.html", { waitUntil: "domcontentloaded" });
  const content = await page.content();
  const $ = cheerio.load(content);

  const productUrls = [];
  $('a[href*="/product/"]').each((_, el) => {
    const h = $(el).attr("href");
    if (h && h.endsWith(".html") && !h.includes("/alpha/")) {
      const full = h.startsWith("http") ? h : new URL(h, "https://www.maharashtradirectory.com/").toString();
      if (!productUrls.includes(full)) productUrls.push(full);
    }
  });

  console.log("Found product URLs under M:", productUrls.length);

  // Sample crawl 4 product URLs
  let totalExtracted = 0;
  for (const pUrl of productUrls.slice(0, 4)) {
    console.log("Crawling product page:", pUrl);
    await page.goto(pUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const pContent = await page.content();
    const $p = cheerio.load(pContent);
    const cards = $p(".rc-body");
    console.log("Cards found:", cards.length);
    cards.each((_, c) => {
      const name = $p(c).find(".rc-title a").text().trim();
      const contact = $p(c).find(".rc-title a").attr("title");
      console.log("  -> Company:", name, "| Contact:", contact);
      totalExtracted++;
    });
  }

  console.log("Total companies extracted in 4 pages:", totalExtracted);
  await browser.close();
})().catch(console.error);

