const { chromium } = require("playwright");

async function checkCategoryContent() {
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

  await page.goto(
    "https://www.maharashtradirectory.com/category/mechanical-engineering/abrasives-and-grinding-media.html",
    { waitUntil: "domcontentloaded" }
  );
  await page.waitForTimeout(2000);

  // Find the links in the central area (e.g. list of products or companies)
  const data = await page.evaluate(() => {
    // Let's inspect the DOM elements under breadcrumb or main container
    const h1 = document.querySelector("h1") ? document.querySelector("h1").innerText : "";
    
    // Find all links that are under content container
    const contentLinks = Array.from(document.querySelectorAll(".container a, main a, #content a, .content a, [class*='content'] a, .row a"))
      .map(a => ({ text: a.innerText.trim(), href: a.href }))
      .filter(l => l.text.length > 2);
      
    // What specific product links are there?
    const productLinks = Array.from(document.querySelectorAll("a"))
      .map(a => ({ text: a.innerText.trim(), href: a.href }))
      .filter(a => a.href.includes("/product/") || a.href.includes("/company/") || (a.href.endsWith(".html") && !a.href.includes("/category/")));

    return {
      h1,
      contentLinksTotal: contentLinks.length,
      sampleContentLinks: contentLinks.slice(0, 20),
      productLinks: productLinks.slice(0, 20),
    };
  });

  console.log("H1:", data.h1);
  console.log("Product links:", data.productLinks);
  console.log("Sample content links:", data.sampleContentLinks);

  // Now navigate to one of the product links
  const targetProduct = data.productLinks[0] || data.sampleContentLinks.find(l => l.href.includes('product') || l.text.toLowerCase().includes('abrasive'));
  if (targetProduct) {
    console.log("\n>>> Navigating to Target Product Page:", targetProduct);
    await page.goto(targetProduct.href, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    console.log("Product Page Title:", await page.title());
    console.log("Product Page URL:", page.url());

    // Inspect the suppliers / companies on this page!
    const productPageInfo = await page.evaluate(() => {
      const body = document.body.innerText;
      // Find cards / companies
      const companyItems = [];
      // Look for cards, listing items
      const listingEls = document.querySelectorAll(".card, [class*='listing'], [class*='item'], .col-md-12, [class*='supplier'], [class*='company']");
      
      // Let's also check all h2, h3, h4
      const headings = Array.from(document.querySelectorAll("h2, h3, h4")).map(h => ({
        tag: h.tagName,
        text: h.innerText.trim(),
        parentClasses: h.parentElement ? h.parentElement.className : ""
      }));
      
      // Check for phone/mobile numbers
      const phoneMatches = Array.from(body.matchAll(/(?:\+91|0)?[6-9]\d{9}/g)).map(m => m[0]);
      
      // Check for "Contact", "Send Inquiry", "View Details"
      const actionLinks = Array.from(document.querySelectorAll("a, button, input[type='button']")).map(el => ({
        tag: el.tagName,
        text: (el.innerText || el.value || "").trim(),
        href: el.href || "",
        onclick: el.getAttribute("onclick") || "",
        dataMob: el.getAttribute("data-mob") || el.getAttribute("data-phone") || el.getAttribute("data-mobile") || el.getAttribute("data-id")
      })).filter(a => a.text.toLowerCase().includes("contact") || a.text.toLowerCase().includes("view") || a.text.toLowerCase().includes("send inquiry") || a.dataMob);

      return {
        headings: headings.slice(0, 15),
        phoneMatches: phoneMatches.slice(0, 10),
        actionLinks: actionLinks.slice(0, 15),
        bodySnippet: body.slice(0, 2000)
      };
    });

    console.log("\nHeadings on Product Page:", productPageInfo.headings);
    console.log("Phone matches on Product Page:", productPageInfo.phoneMatches);
    console.log("Action Links / Contact triggers:", productPageInfo.actionLinks);
    console.log("\nBody Snippet:\n", productPageInfo.bodySnippet);
  }

  await browser.close();
}

checkCategoryContent().catch(console.error);

