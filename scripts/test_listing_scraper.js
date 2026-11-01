const { chromium } = require("playwright");

async function testListingScraper() {
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

  // Navigate through home first for session warmup
  await page.goto("https://www.maharashtradirectory.com/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const productUrl = "https://www.maharashtradirectory.com/product/abrasive-cutting-wheels.html";
  console.log("Navigating to listings page:", productUrl);
  await page.goto(productUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Extract listing cards
  const records = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".rc-body"));
    return cards.map((card, idx) => {
      // 1. Company Name & Contact from title attribute
      const titleLink = card.querySelector(".rc-title a");
      const companyName = titleLink ? titleLink.innerText.trim() : "";
      const contactTitle = titleLink ? titleLink.getAttribute("title") || "" : "";
      
      // Extract person & designation from title="Contact: MR. JATIN SHAH / MR. ROMIL SHAH (PROPRIETOR)"
      let contactPerson = "";
      let designation = "";
      if (contactTitle.includes("Contact:")) {
        const raw = contactTitle.replace(/^Contact:\s*/i, "").trim();
        const desigMatch = raw.match(/\(([^)]+)\)$/);
        if (desigMatch) {
          designation = desigMatch[1].trim();
          contactPerson = raw.replace(/\(([^)]+)\)$/, "").trim();
        } else {
          contactPerson = raw;
        }
      }

      // 2. Company Info URL
      const companyInfoHref = titleLink ? titleLink.getAttribute("href") : "";
      const fullCompanyInfoUrl = companyInfoHref ? new URL(companyInfoHref, window.location.href).toString() : "";

      // 3. Address / City
      // Often in text below title: "Mumbai - 400020 , India"
      const text = card.innerText;
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      let address = "";
      for (const line of lines) {
        if (line.match(/(?:Mumbai|Pune|Thane|Nashik|Navi Mumbai|Maharashtra|\d{6})/i) && !line.includes("JATIN") && !line.includes("Tel") && !line.includes("www")) {
          address = line;
          break;
        }
      }

      // 4. Products / Description
      const descEl = card.querySelector("p, .rc-desc, [class*='desc']");
      const description = descEl ? descEl.innerText.trim() : "";

      // 5. Catalog Link
      const catLink = card.querySelector("a[href*='cataloginfo']");
      const catalogUrl = catLink ? new URL(catLink.getAttribute("href"), window.location.href).toString() : "";

      // 6. Data attributes (de-obfuscated IDs)
      const compId = card.getAttribute("data-company-id") || (card.closest("[data-company-id]") ? card.closest("[data-company-id]").getAttribute("data-company-id") : "");

      return {
        id: `rec_${idx + 1}`,
        companyName,
        contactPerson,
        designation,
        address,
        companyInfoUrl: fullCompanyInfoUrl,
        catalogUrl,
        description: description.slice(0, 150),
        companyId: compId
      };
    }).filter(r => r.companyName.length > 2);
  });

  console.log(`Successfully extracted ${records.length} structured company records from page 1!`);
  console.log("Sample records:\n", JSON.stringify(records.slice(0, 3), null, 2));

  // Now test deep crawling for the first record into its companyinfo page:
  if (records[0] && records[0].companyInfoUrl) {
    console.log(`\nDeep crawling into record 1: ${records[0].companyInfoUrl}...`);
    await page.goto(records[0].companyInfoUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    const deepInfo = await page.evaluate(() => {
      // Extract JSON-LD schema
      const jsonLds = Array.from(document.querySelectorAll("script[type='application/ld+json']")).map(s => {
        try { return JSON.parse(s.innerText); } catch { return null; }
      }).filter(Boolean);

      const localBusiness = jsonLds.find(j => j["@type"] && (j["@type"].includes("LocalBusiness") || j["@type"].includes("Organization")));

      let fullAddress = "";
      let locality = "";
      let region = "";
      let postalCode = "";
      let employeeName = "";
      let imageUrl = "";

      if (localBusiness) {
        if (localBusiness.address) {
          fullAddress = localBusiness.address.streetAddress || "";
          locality = localBusiness.address.addressLocality || "";
          region = localBusiness.address.addressRegion || "";
          postalCode = localBusiness.address.postalCode || "";
        }
        if (localBusiness.employee) {
          employeeName = localBusiness.employee.name || "";
        }
        imageUrl = localBusiness.image || "";
      }

      // Also extract products listed on company page
      const products = Array.from(document.querySelectorAll(".prod-name, [class*='prod'], .card-title, li a[href*='product']")).map(p => p.innerText.trim()).filter(t => t.length > 2).slice(0, 10);

      return {
        fullAddress,
        locality,
        region,
        postalCode,
        employeeName,
        imageUrl,
        sampleProducts: products
      };
    });

    console.log("Deep Scraped Info from Company Detail Page:\n", JSON.stringify(deepInfo, null, 2));
  }

  await browser.close();
}

testListingScraper().catch(console.error);

