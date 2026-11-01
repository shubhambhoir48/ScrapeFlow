const { chromium } = require("playwright");

async function run() {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: [
      "--headless=new",
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1920,1080",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 768 },
    locale: "en-US",
  });

  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {}, app: {} };
  });

  console.log("Navigating to https://www.maharashtradirectory.com/ ...");
  const resp = await page.goto("https://www.maharashtradirectory.com/", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);
  console.log("Status:", resp ? resp.status() : "none", "Title:", await page.title());

  // Extract links
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a"))
      .map((a) => ({ text: a.innerText.trim(), href: a.href }))
      .filter((l) => l.text.length > 2 && l.href.startsWith("http"));
  });

  console.log("Total links on root:", links.length);
  const catLinks = links.filter(
    (l) =>
      l.href.includes("maharashtradirectory.com") &&
      !l.href.includes("login") &&
      !l.href.includes("contactus") &&
      !l.href.includes("about") &&
      l.text.length > 3
  );

  console.log("Sample category links:", catLinks.slice(5, 15));

  // Let's pick one category link e.g. Abrasives or Chemical or Pumps
  const chosenCat =
    catLinks.find(
      (l) =>
        l.text.toLowerCase().includes("abrasive") ||
        l.text.toLowerCase().includes("pump") ||
        l.text.toLowerCase().includes("chemical") ||
        l.text.toLowerCase().includes("machin")
    ) || catLinks[10];

  if (chosenCat) {
    console.log("\n>>> Navigating to Category/Listing Level 2:", chosenCat);
    await page.goto(chosenCat.href, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    console.log("L2 Page Title:", await page.title());
    console.log("L2 Page URL:", page.url());

    // Inspect L2 DOM: does it have subcategories or company listings?
    const l2Info = await page.evaluate(() => {
      const links2 = Array.from(document.querySelectorAll("a")).map((a) => ({
        text: a.innerText.trim(),
        href: a.href,
      }));
      // Check for pagination links
      const pagination = links2.filter(
        (l) =>
          l.text.match(/^[0-9]+$/) ||
          l.text.toLowerCase().includes("next") ||
          l.href.includes("page=") ||
          l.href.includes("pg=")
      );
      // Check for buttons or onclicks
      const onclicks = Array.from(document.querySelectorAll("[onclick]"))
        .map((el) => el.getAttribute("onclick"))
        .slice(0, 10);
      // Check for cards or company elements
      const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4"))
        .map((h) => h.innerText.trim())
        .filter((t) => t.length > 0)
        .slice(0, 15);

      return {
        pagination,
        onclicks,
        headings,
        sampleLinks: links2.slice(0, 20),
        textSnippet: document.body.innerText.slice(0, 1500),
      };
    });

    console.log("L2 Headings:", l2Info.headings);
    console.log("L2 Pagination detected:", l2Info.pagination);
    console.log("L2 Onclicks (masked data triggers):", l2Info.onclicks);
    console.log("\nL2 Text Snippet:\n", l2Info.textSnippet);
  }

  await browser.close();
}

run().catch((e) => console.error(e));

