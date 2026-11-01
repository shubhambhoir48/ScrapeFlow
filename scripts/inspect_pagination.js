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
  await page.addInitScript(() => { Object.defineProperty(navigator, "webdriver", { get: () => undefined }); });

  await page.goto("https://www.maharashtradirectory.com/product/punch-clamps.html", { waitUntil: "domcontentloaded" });
  const html = await page.content();
  const $ = cheerio.load(html);

  console.log("Pagination elements found on punch-clamps:");
  $(".pagination a, [class*='page'] a, a[href*='page'], a[href*='pg='], a[href*='p=']").each((_, a) => {
    console.log("Pagination link:", $(a).text().trim(), "->", $(a).attr("href"));
  });

  // Try another product e.g. cnc-router or m-s-erw-pipe
  await page.goto("https://www.maharashtradirectory.com/product/m-s-erw-pipe.html", { waitUntil: "domcontentloaded" });
  const html2 = await page.content();
  const $2 = cheerio.load(html2);
  console.log("Pagination elements found on m-s-erw-pipe:");
  $2(".pagination a, [class*='page'] a, a[href*='page'], a[href*='pg='], a[href*='p=']").each((_, a) => {
    console.log("Pagination link:", $2(a).text().trim(), "->", $2(a).attr("href"));
  });

  await browser.close();
})().catch(console.error);

