const { chromium } = require("playwright");

async function checkCompanyInfo() {
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
  console.log("Navigating to Company Info page:", companyUrl);
  await page.goto(companyUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const data = await page.evaluate(() => {
    const text = document.body.innerText;
    const html = document.body.innerHTML;
    // Check for phone, email, address, contact persons, gst, website
    const phones = text.match(/(?:\+91|91|0)?[-\s]?[6-9]\d{9}/g) || [];
    const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const mailtos = Array.from(document.querySelectorAll("a[href^='mailto:']")).map(a => a.href);
    const tels = Array.from(document.querySelectorAll("a[href^='tel:']")).map(a => a.href);
    
    // Check tables or definition lists
    const tableRows = Array.from(document.querySelectorAll("tr, dl, .row, [class*='info'], [class*='contact'], [class*='address']")).map(r => r.innerText.trim()).filter(t => t.length > 5 && t.length < 300);

    return {
      title: document.title,
      phones: Array.from(new Set(phones)),
      emails: Array.from(new Set(emails)),
      mailtos,
      tels,
      tableRowsSample: tableRows.slice(0, 20),
      bodySnippet: text.slice(0, 3000),
      rawHtmlSnippet: html.slice(0, 4000)
    };
  });

  console.log("Title:", data.title);
  console.log("Phones found:", data.phones);
  console.log("Emails found:", data.emails);
  console.log("Mailto links:", data.mailtos);
  console.log("Tel links:", data.tels);
  console.log("Table / Info Rows:\n", data.tableRowsSample);
  console.log("\nBody Snippet:\n", data.bodySnippet);

  await browser.close();
}

checkCompanyInfo().catch(console.error);

