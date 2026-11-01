const { chromium } = require("playwright");

async function inspectMaskedPhoneHtml() {
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

  await page.goto("https://www.maharashtradirectory.com/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const companyUrl = "https://www.maharashtradirectory.com/companyinfo/jatin-engineering-company-mumbai-169259.html";
  await page.goto(companyUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const phoneDetails = await page.evaluate(() => {
    // Find all elements containing '**********' or '(View)'
    const matched = [];
    document.querySelectorAll("*").forEach((el) => {
      const text = el.innerText || "";
      if (el.children.length === 0 && (text.includes("****") || text.includes("(View)"))) {
        matched.push({
          tag: el.tagName,
          text: text,
          parentHtml: el.parentElement ? el.parentElement.outerHTML : "",
          attributes: Array.from(el.attributes).map((a) => `${a.name}="${a.value}"`),
        });
      }
    });

    // Check all script contents
    const scripts = Array.from(document.querySelectorAll("script"))
      .map((s) => s.innerText || "")
      .filter((s) => s.includes("view") || s.includes("enquiry") || s.includes("popup") || s.includes("mobile"));

    // Check JSON-LD
    const jsonLd = Array.from(document.querySelectorAll("script[type='application/ld+json']")).map((s) => s.innerText);

    return {
      matchedElements: matched,
      jsonLd,
      scriptsCount: scripts.length,
      firstScript: scripts[0] ? scripts[0].slice(0, 1500) : "none",
    };
  });

  console.log("Matched Elements for Masked Phone:\n", JSON.stringify(phoneDetails.matchedElements, null, 2));
  console.log("\nJSON-LD Schemas:\n", phoneDetails.jsonLd);
  console.log("\nScripts Count:", phoneDetails.scriptsCount);
  console.log("\nFirst Script:\n", phoneDetails.firstScript);

  await browser.close();
}

inspectMaskedPhoneHtml().catch(console.error);
