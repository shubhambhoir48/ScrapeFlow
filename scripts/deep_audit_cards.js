const { chromium } = require("playwright");

async function deepAuditCards() {
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

  const productUrl = "https://www.maharashtradirectory.com/product/abrasive-cutting-wheels.html";
  await page.goto(productUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Remove any modal or cookieBanner overlay
  await page.evaluate(() => {
    const banner = document.getElementById("cookieBanner");
    if (banner) banner.remove();
    document.querySelectorAll(".modal-backdrop, .overlay").forEach((e) => e.remove());
  });

  // Now inspect the exact HTML of the company cards
  const cardsHtml = await page.evaluate(() => {
    // Let's find all elements with class 'rc-body' or cards
    const cards = Array.from(document.querySelectorAll(".rc-body, .rc-box, .result-card, [class*='result'], [class*='company']"));
    
    // Find all links to catalog or company pages
    const catalogLinks = Array.from(document.querySelectorAll("a[href*='cataloginfo'], a[href*='company']")).map((a) => ({
      text: a.innerText.trim(),
      href: a.href,
    }));

    // Find all data attributes on the entire page
    const allDataAttrs = [];
    document.querySelectorAll("*").forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        if (attr.name.startsWith("data-") && (attr.name.includes("comp") || attr.name.includes("phone") || attr.name.includes("tel") || attr.name.includes("id") || attr.name.includes("web"))) {
          allDataAttrs.push(`${attr.name} = ${attr.value}`);
        }
      });
    });

    return {
      cardsCount: cards.length,
      firstCardHtml: cards[0] ? cards[0].outerHTML : "none",
      secondCardHtml: cards[1] ? cards[1].outerHTML : "none",
      catalogLinks: catalogLinks.slice(0, 10),
      dataAttrsSample: allDataAttrs.slice(0, 25),
    };
  });

  console.log("Cards count:", cardsHtml.cardsCount);
  console.log("\nFirst Card HTML:\n", cardsHtml.firstCardHtml);
  console.log("\nCatalog Links:\n", cardsHtml.catalogLinks);
  console.log("\nData Attributes Sample:\n", cardsHtml.dataAttrsSample);

  // Now let's visit one of the catalogLinks!
  if (cardsHtml.catalogLinks.length > 0) {
    const catUrl = cardsHtml.catalogLinks[0].href;
    console.log("\nVisiting Catalog Link:", catUrl);
    await page.goto(catUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    console.log("Catalog title:", await page.title());

    const catalogContent = await page.evaluate(() => {
      const text = document.body.innerText;
      // find phone, email, contact person, address
      const phones = text.match(/(?:\+91|91|0)?[-\s]?[6-9]\d{9}/g) || [];
      const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      const links = Array.from(document.querySelectorAll("a")).map((a) => ({ text: a.innerText.trim(), href: a.href }));
      return {
        phones: Array.from(new Set(phones)),
        emails: Array.from(new Set(emails)),
        contactUsLink: links.filter((l) => l.text.toLowerCase().includes("contact") || l.href.includes("contact")),
        bodyTextSnippet: text.slice(0, 2000),
      };
    });

    console.log("\nCatalog Phones:", catalogContent.phones);
    console.log("Catalog Emails:", catalogContent.emails);
    console.log("Catalog ContactUs Links:", catalogContent.contactUsLink);
    console.log("\nCatalog Snippet:\n", catalogContent.bodyTextSnippet);

    // If there is a Contact Us link on the company catalog, visit it!
    const compContact = catalogContent.contactUsLink.find((l) => !l.href.includes("maharashtradirectory.com/contactus.html"));
    if (compContact) {
      console.log("\nVisiting Company Contact Us page:", compContact.href);
      await page.goto(compContact.href, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
      const contactPageText = await page.evaluate(() => document.body.innerText.slice(0, 2000));
      console.log("\nCompany Contact Us Page text:\n", contactPageText);
    }
  }

  await browser.close();
}

deepAuditCards().catch(console.error);

