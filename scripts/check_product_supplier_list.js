const { chromium } = require("playwright");

async function checkProductSupplierList() {
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
  console.log("Navigating to product supplier listing:", productUrl);
  await page.goto(productUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  console.log("Product Page Title:", await page.title());

  const result = await page.evaluate(() => {
    // Check company blocks
    const companies = [];
    // Check elements that have company name, address, contact
    const headings = Array.from(document.querySelectorAll("h2, h3, h4, h5, .company-name, [class*='title'], [class*='comp']")).map(h => ({
      tag: h.tagName,
      text: h.innerText.trim(),
      parentClass: h.parentElement ? h.parentElement.className : ""
    })).filter(h => h.text.length > 3 && !h.text.toLowerCase().includes("category") && !h.text.toLowerCase().includes("filter"));

    // Check all buttons, links with phone, view mobile, contact, onclick, data-*
    const interactiveElements = Array.from(document.querySelectorAll("a, button, span[onclick], div[onclick]")).map(el => {
      const attrs = {};
      for (let i = 0; i < el.attributes.length; i++) {
        const a = el.attributes[i];
        if (a.name.startsWith("data-") || a.name === "onclick" || a.name === "href" || a.name === "class" || a.name === "id") {
          attrs[a.name] = a.value;
        }
      }
      return {
        tag: el.tagName,
        text: (el.innerText || "").trim(),
        attrs
      };
    }).filter(e => {
      const t = e.text.toLowerCase();
      const o = (e.attrs.onclick || "").toLowerCase();
      return t.includes("mobile") || t.includes("phone") || t.includes("contact") || t.includes("view") || t.includes("call") || o.includes("phone") || o.includes("mob") || o.includes("contact");
    });

    // Check pagination
    const pagination = Array.from(document.querySelectorAll(".pagination a, a[href*='page='], a[href*='pg='], [class*='page'] a")).map(a => ({
      text: a.innerText.trim(),
      href: a.href
    }));

    return {
      headings: headings.slice(0, 15),
      interactiveElements: interactiveElements.slice(0, 15),
      pagination: pagination.slice(0, 10),
      rawBodySnippet: document.body.innerText.slice(0, 3000)
    };
  });

  console.log("Headings found:", result.headings);
  console.log("\nInteractive / Masked elements found:", result.interactiveElements);
  console.log("\nPagination links:", result.pagination);
  console.log("\nRaw Body Snippet:\n", result.rawBodySnippet);

  await browser.close();
}

checkProductSupplierList().catch(console.error);

