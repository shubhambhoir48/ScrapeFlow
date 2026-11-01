const { chromium } = require("playwright");

async function testGoogleAndMaps() {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--headless=new", "--disable-blink-features=AutomationControlled"],
  });
  const page = await browser.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  // Test 1: Google Search
  console.log("Testing Google Search for 'Jatin Engineering Company Mumbai Marine Lines'...");
  try {
    await page.goto("https://www.google.com/search?q=" + encodeURIComponent("Jatin Engineering Company Mumbai Marine Lines phone"), {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    const phones = text.match(/(?:\+91[-\s]?)?[6-9]\d{9}/g) || [];
    const landlines = text.match(/022[-\s]?\d{7,8}/g) || [];
    console.log("Google Phones found:", Array.from(new Set([...phones, ...landlines])));
    console.log("Google Snippet:\n", text.slice(0, 500));
  } catch (e) {
    console.log("Google error:", e.message);
  }

  // Test 2: Google Maps Search
  console.log("\nTesting Google Maps for 'Jatin Engineering Company Mumbai'...");
  try {
    await page.goto("https://www.google.com/maps/search/" + encodeURIComponent("Jatin Engineering Company Mumbai"), {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await page.waitForTimeout(3000);
    const mapsText = await page.evaluate(() => document.body.innerText);
    const phones = mapsText.match(/(?:\+91[-\s]?)?[6-9]\d{9}/g) || [];
    const landlines = mapsText.match(/022[-\s]?\d{7,8}/g) || [];
    console.log("Google Maps Phones found:", Array.from(new Set([...phones, ...landlines])));
    console.log("Google Maps Snippet:\n", mapsText.slice(0, 600));
  } catch (e) {
    console.log("Maps error:", e.message);
  }

  await browser.close();
}

testGoogleAndMaps().catch(console.error);

