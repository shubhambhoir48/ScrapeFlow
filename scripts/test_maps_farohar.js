const { chromium } = require("playwright");

async function testMapsFarohar() {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--headless=new", "--disable-blink-features=AutomationControlled"],
  });
  const page = await browser.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const query = "Farohar Engineering Ambernath";
  console.log("Searching Google Maps for:", query);

  await page.goto("https://www.google.com/maps/search/" + encodeURIComponent(query), {
    waitUntil: "domcontentloaded",
    timeout: 20000,
  });
  await page.waitForTimeout(3500);

  const mapsData = await page.evaluate(() => {
    const text = document.body.innerText;
    // Look for phone
    const phones = text.match(/(?:\+91[-\s]?)?[0-9]{2,5}[-\s]?[0-9]{6,10}/g) || [];
    // Look for website
    const allLinks = Array.from(document.querySelectorAll("a[href]")).map((a) => a.href);
    return {
      snippet: text.slice(0, 1200),
      phones,
      links: allLinks.filter((l) => !l.includes("google.com")),
    };
  });

  console.log("Maps Result Snippet:\n", mapsData.snippet);
  console.log("Phones extracted:", mapsData.phones);

  await browser.close();
}

testMapsFarohar().catch(console.error);

