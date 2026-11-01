const { chromium } = require("playwright");

async function testFreeSearchEngines() {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--headless=new", "--disable-blink-features=AutomationControlled"],
  });
  const page = await browser.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const query = "FAROHAR ENGINEERING Ambernath contact phone email";

  // Test 1: Bing
  console.log("Testing Bing for:", query);
  try {
    await page.goto("https://www.bing.com/search?q=" + encodeURIComponent(query), {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await page.waitForTimeout(2000);
    const bingText = await page.evaluate(() => document.body.innerText);
    const phones = bingText.match(/(?:\+91[-\s]?)?[6-9]\d{9}/g) || [];
    const emails = bingText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#b_results h2 a")).map((a) => ({
        title: a.innerText,
        href: a.href,
      }))
    );
    console.log("Bing Phones:", phones.slice(0, 5));
    console.log("Bing Emails:", emails.slice(0, 5));
    console.log("Bing Links:", links.slice(0, 5));
  } catch (e) {
    console.log("Bing failed:", e.message);
  }

  // Test 2: Yahoo Search
  console.log("\nTesting Yahoo Search for:", query);
  try {
    await page.goto("https://search.yahoo.com/search?p=" + encodeURIComponent(query), {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await page.waitForTimeout(2000);
    const yahooText = await page.evaluate(() => document.body.innerText);
    const phones = yahooText.match(/(?:\+91[-\s]?)?[6-9]\d{9}/g) || [];
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll("h3 a")).map((a) => ({
        title: a.innerText,
        href: a.href,
      }))
    );
    console.log("Yahoo Phones:", phones.slice(0, 5));
    console.log("Yahoo Links:", links.slice(0, 5));
  } catch (e) {
    console.log("Yahoo failed:", e.message);
  }

  await browser.close();
}

testFreeSearchEngines().catch(console.error);

