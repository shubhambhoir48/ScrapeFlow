const { chromium } = require("playwright");

async function checkL2Links() {
  const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--headless=new", "--disable-blink-features=AutomationControlled"] });
  const page = await browser.newPage();
  await page.addInitScript(() => { Object.defineProperty(navigator, "webdriver", { get: () => undefined }); });
  
  const targetUrl = "https://www.maharashtradirectory.com/category/mechanical-engineering/abrasives-and-grinding-media.html";
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  
  const allLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a")).map(a => ({
      text: a.innerText.trim(),
      hrefAttr: a.getAttribute("href"),
      hrefProp: a.href
    }));
  });
  
  console.log("Total a tags on L2:", allLinks.length);
  console.log("First 30 links on L2:", allLinks.slice(15, 35));
  
  await browser.close();
}

checkL2Links().catch(console.error);

