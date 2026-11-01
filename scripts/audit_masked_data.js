const { chromium } = require("playwright");

async function auditMaskedData() {
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
  await page.waitForTimeout(3000);

  // 1. Inspect the HTML of the first card and the .view-number-link element
  const cardDetails = await page.evaluate(() => {
    const link = document.querySelector(".view-number-link");
    const parent = link ? link.closest(".rc-body, div, li") : null;
    
    // Check all scripts on the page for view-number-link handlers
    const scripts = Array.from(document.querySelectorAll("script")).map(s => s.innerText).filter(t => t.includes("view-number-link") || t.includes("viewNumber") || t.includes("showNumber") || t.includes("phone"));

    return {
      linkHtml: link ? link.outerHTML : "not found",
      parentHtml: parent ? parent.innerHTML.slice(0, 1000) : "not found",
      scriptsCount: scripts.length,
      sampleScript: scripts[0] ? scripts[0].slice(0, 1000) : "none"
    };
  });

  console.log("Card details:", JSON.stringify(cardDetails, null, 2));

  // 2. Click the view-number-link and see what happens!
  console.log("\nAttempting to click .view-number-link...");
  const firstViewNumber = await page.$(".view-number-link");
  if (firstViewNumber) {
    await firstViewNumber.click();
    await page.waitForTimeout(2000);
    
    // Check if modal popped up or text changed
    const afterClick = await page.evaluate(() => {
      const modal = document.querySelector(".modal, [class*='popup'], [class*='dialog'], [id*='modal'], [id*='popup']");
      const link = document.querySelector(".view-number-link");
      const parent = link ? link.parentElement : null;
      return {
        modalText: modal ? modal.innerText : "No modal",
        parentText: parent ? parent.innerText : "No parent",
      };
    });
    console.log("After click result:", afterClick);
  }

  // 3. Check the Catalog / Company Profile link: /cataloginfo/jatin-engineering-company-mumbai-169259.html
  const catalogUrl = "https://www.maharashtradirectory.com/cataloginfo/jatin-engineering-company-mumbai-169259.html";
  console.log("\n>>> Navigating to Catalog / Company Detail page:", catalogUrl);
  await page.goto(catalogUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const catalogDetails = await page.evaluate(() => {
    return {
      title: document.title,
      textSnippet: document.body.innerText.slice(0, 2000),
      links: Array.from(document.querySelectorAll("a")).map(a => ({ text: a.innerText.trim(), href: a.href })).filter(l => l.text.toLowerCase().includes("contact") || l.href.includes("contact") || l.text.match(/\d{5,}/)),
      metaTags: Array.from(document.querySelectorAll("meta")).map(m => `${m.getAttribute("name") || m.getAttribute("property")}: ${m.getAttribute("content")}`)
    };
  });

  console.log("Catalog Title:", catalogDetails.title);
  console.log("Catalog Contact Links:", catalogDetails.links);
  console.log("Catalog Text Snippet:\n", catalogDetails.textSnippet);

  await browser.close();
}

auditMaskedData().catch(console.error);

