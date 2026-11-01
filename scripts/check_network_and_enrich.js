const { chromium } = require("playwright");

async function checkNetworkRequests() {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--headless=new", "--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const capturedUrls = [];
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("api") || url.includes("json") || url.includes("Company") || url.includes("get") || url.includes("phone")) {
      capturedUrls.push({ method: req.method(), url });
    }
  });

  await page.goto("https://www.maharashtradirectory.com/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const companyUrl = "https://www.maharashtradirectory.com/companyinfo/jatin-engineering-company-mumbai-169259.html";
  await page.goto(companyUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  console.log("Captured interesting requests:\n", capturedUrls);

  // Now, what if we search DuckDuckGo / SearXNG / metasearch for this company and address?
  // Let's test enriching this company name "JATIN ENGINEERING COMPANY" Marine Lines Mumbai phone email:
  console.log("\nTesting free search enrichment for contact details...");
  await page.goto("https://html.duckduckgo.com/html/?q=" + encodeURIComponent('"JATIN ENGINEERING COMPANY" Mumbai Marine Drive phone OR mobile OR email OR website'), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const searchResults = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".result")).map(r => {
      const title = r.querySelector(".result__title") ? r.querySelector(".result__title").innerText : "";
      const snippet = r.querySelector(".result__snippet") ? r.querySelector(".result__snippet").innerText : "";
      const url = r.querySelector(".result__url") ? r.querySelector(".result__url").innerText : "";
      return { title, snippet, url };
    }).slice(0, 5);
  });

  console.log("Enriched Search Results for Jatin Engineering Company:\n", JSON.stringify(searchResults, null, 2));

  await browser.close();
}

checkNetworkRequests().catch(console.error);

