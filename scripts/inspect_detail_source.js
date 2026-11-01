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

  console.log("Navigating to Farohar Engineering detail page...");
  await page.goto("https://www.maharashtradirectory.com/companyinfo/farohar-engineering-ambernath-144577.html", {
    waitUntil: "domcontentloaded",
  });
  const content = await page.content();
  console.log("Detail page content length:", content.length);

  // Search for any email
  const emails = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  console.log("Emails found in raw HTML:", emails);

  // Search for phone numbers
  const phones = content.match(/(?:\+91[-\s]?)?[6-9]\d{9}/g);
  console.log("Phone numbers found in raw HTML:", phones);

  const $ = cheerio.load(content);
  $("script").each((i, el) => {
    const text = $(el).html() || "";
    if (text.includes("telephone") || text.includes("email") || text.includes("pressbrake") || text.includes("farohar")) {
      console.log(`Script ${i} snippet:`, text.slice(0, 400));
    }
  });

  // Check catalog page
  console.log("\nChecking cataloginfo link...");
  const catLink = $("a[href*='cataloginfo']").attr("href");
  console.log("Catalog link:", catLink);
  if (catLink) {
    const fullCat = catLink.startsWith("http") ? catLink : new URL(catLink, page.url()).toString();
    await page.goto(fullCat, { waitUntil: "domcontentloaded" });
    const catContent = await page.content();
    const catEmails = catContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    console.log("Emails on catalog page:", catEmails);
    const catPhones = catContent.match(/(?:\+91[-\s]?)?[6-9]\d{9}/g);
    console.log("Phones on catalog page:", catPhones);
  }

  await browser.close();
})().catch(console.error);

