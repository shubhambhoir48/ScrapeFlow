const { chromium } = require("playwright");

async function testCascadeEnrichment() {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--headless=new", "--disable-blink-features=AutomationControlled"],
  });
  const page = await browser.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const query = '"FAROHAR ENGINEERING" Ambernath phone OR mobile OR email OR website';
  console.log("Searching OSINT metasearch for:", query);

  await page.goto("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query), {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(2000);

  const results = await page.evaluate(() => {
    const text = document.body.innerText;
    // Extract phone numbers
    const phones = text.match(/(?:\+91[-\s]?)?[6-9]\d{9}/g) || [];
    const landlines = text.match(/0251[-\s]?\d{6,8}|022[-\s]?\d{7,8}/g) || [];
    // Extract emails
    const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    // Extract websites
    const links = Array.from(document.querySelectorAll("a[href]"))
      .map((a) => a.href)
      .filter((h) => !h.includes("duckduckgo") && !h.includes("google") && !h.includes("bing"));

    return {
      phones: Array.from(new Set([...phones, ...landlines])),
      emails: Array.from(new Set(emails)),
      sampleText: text.slice(0, 1500),
      links: links.slice(0, 10),
    };
  });

  console.log("\n--- UNMASKED CASCADE RESULTS ---");
  console.log("Recovered Phone Numbers:", results.phones);
  console.log("Recovered Emails:", results.emails);
  console.log("Recovered Domains/Links:", results.links);
  console.log("Snippet:\n", results.sampleText.slice(0, 800));

  await browser.close();
}

testCascadeEnrichment().catch(console.error);

