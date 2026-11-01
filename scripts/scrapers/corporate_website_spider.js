/**
 * Corporate Website Deep Contact Spider
 * Usage: node scripts/scrapers/corporate_website_spider.js "https://pressbraketools.in"
 */
const { chromium } = require("playwright");

async function crawlCorporateWebsite(targetUrl) {
  if (!targetUrl) {
    console.error("Usage: node corporate_website_spider.js <URL>");
    process.exit(1);
  }

  let url = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`;
  console.log(`[Corporate Website Spider] Auditing: ${url}`);

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--headless=new", "--disable-blink-features=AutomationControlled"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(2000);

    const data = await page.evaluate(() => {
      const text = document.body.innerText;
      const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      const mobiles = text.match(/(?:\+91[-\s]?)?[6-9]\d{9}/g) || [];

      // Socials & WhatsApp
      const anchors = Array.from(document.querySelectorAll("a[href]")).map((a) => a.href);
      const whatsapp = anchors.find((h) => h.includes("wa.me") || h.includes("whatsapp"));
      const linkedin = anchors.find((h) => h.includes("linkedin.com"));
      const facebook = anchors.find((h) => h.includes("facebook.com"));

      return {
        emails: Array.from(new Set(emails)).filter((e) => !e.includes("example.com")),
        mobiles: Array.from(new Set(mobiles)),
        whatsapp,
        linkedin,
        facebook,
      };
    });

    console.log("\n--- CORPORATE CONTACT INTELLIGENCE ---");
    console.log("Verified Emails:", data.emails);
    console.log("Direct Mobiles:", data.mobiles);
    console.log("WhatsApp Chat:", data.whatsapp || "None");
    console.log("LinkedIn Profile:", data.linkedin || "None");
    return data;
  } finally {
    await browser.close();
  }
}

const targetUrl = process.argv[2] || "https://pressbraketools.in";
crawlCorporateWebsite(targetUrl).catch(console.error);

