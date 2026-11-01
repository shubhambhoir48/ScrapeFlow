const { chromium } = require("playwright");

async function testGoogleMapsScraper(query, location, maxPlaces = 10) {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--window-size=1920,1080",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
  });

  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const fullQuery = `${query} in ${location}`;
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(fullQuery)}`;
  console.log(`[Google Maps Scraper] Navigating to: ${searchUrl}`);

  await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 35000 });
  await page.waitForTimeout(3000);

  // Check consent banner
  try {
    const consentBtn = await page.$("button[aria-label*='Accept all'], form[action*='consent'] button");
    if (consentBtn) await consentBtn.click();
  } catch {}

  console.log("Page title:", await page.title());

  // Google Maps feed container selector
  const feedSelector = 'div[role="feed"]';
  await page.waitForSelector(feedSelector, { timeout: 10000 }).catch(() => {});

  const feedExists = (await page.$(feedSelector)) !== null;
  console.log("Feed container found:", feedExists);

  // Scroll through feed to load places
  const places = [];
  let scrollAttempts = 0;
  const maxScrolls = 8;

  while (places.length < maxPlaces && scrollAttempts < maxScrolls) {
    scrollAttempts++;

    // Extract currently visible places in feed
    const items = await page.$$eval('div[role="feed"] > div > div[role="article"], div[role="feed"] a[href*="/maps/place/"]', (els) => {
      return els.map((el) => {
        // Try finding anchor
        const a = el.tagName === "A" ? el : el.querySelector('a[href*="/maps/place/"]');
        const href = a ? a.href : "";
        const title = a ? a.getAttribute("aria-label") || a.innerText.split("\n")[0] : el.innerText.split("\n")[0];
        const allText = el.innerText || "";
        return { title, href, allText };
      }).filter((x) => x.title && x.title.length > 2);
    });

    console.log(`[Scroll ${scrollAttempts}] Extracted ${items.length} place cards in feed.`);

    for (const it of items) {
      if (!places.some((p) => p.title === it.title)) {
        places.push(it);
        if (places.length >= maxPlaces) break;
      }
    }

    if (places.length >= maxPlaces) break;

    // Scroll down the feed
    if (feedExists) {
      await page.$eval(feedSelector, (el) => el.scrollBy(0, 1500));
      await page.waitForTimeout(2000);
    } else {
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(2000);
    }
  }

  console.log(`Total unique places collected: ${places.length}`);
  console.log("Sample places:", places.slice(0, 5));

  // Now inspect details of the first 2 places to test extracting phone, address, rating, website
  const detailedPlaces = [];
  for (const p of places.slice(0, 3)) {
    if (p.href) {
      console.log(`\nInspecting Place Details for: ${p.title}`);
      await page.goto(p.href, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(2000);

      const placeData = await page.evaluate(() => {
        const name = document.querySelector("h1")?.innerText.trim() || "";
        const rating = document.querySelector('span[aria-label*="stars"], span[aria-label*="star"]')?.getAttribute("aria-label") || "";
        const reviews = document.querySelector('span[aria-label*="reviews"]')?.getAttribute("aria-label") || "";
        const category = document.querySelector('button[jsaction*="category"]')?.innerText.trim() || "";
        
        // Find phone button
        const phoneBtn = document.querySelector('button[data-item-id*="phone"]');
        const phone = phoneBtn ? phoneBtn.innerText.replace(/\n/g, " ").trim() : "";

        // Find address button
        const addressBtn = document.querySelector('button[data-item-id*="address"]');
        const address = addressBtn ? addressBtn.innerText.replace(/\n/g, " ").trim() : "";

        // Find website link
        const websiteLink = document.querySelector('a[data-item-id="authority"]');
        const website = websiteLink ? websiteLink.href : "";

        return { name, rating, reviews, category, phone, address, website };
      });

      console.log("Extracted Place Data:", placeData);
      detailedPlaces.push({ ...p, ...placeData });
    }
  }

  await browser.close();
  return detailedPlaces;
}

testGoogleMapsScraper("CNC Machining Companies", "Thane, Maharashtra", 5)
  .catch(console.error);

