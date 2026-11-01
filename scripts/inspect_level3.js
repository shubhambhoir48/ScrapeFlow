const { chromium } = require("playwright");

async function run() {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--headless=new", "--disable-blink-features=AutomationControlled"],
  });
  const page = await browser.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const targetUrl =
    "https://www.maharashtradirectory.com/category/mechanical-engineering/abrasives-and-grinding-media.html";
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const subLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a"))
      .map((a) => ({ text: a.innerText.trim(), href: a.href }))
      .filter((l) => l.text.length > 3 && l.href.includes("maharashtradirectory.com"));
  });

  console.log("SubLinks sample from L2:", subLinks.slice(10, 25));

  // Let's find a product link
  const prodLink = subLinks.find(
    (l) =>
      l.href.includes("/product/") ||
      (l.href.endsWith(".html") && !l.href.includes("/category/"))
  ) || subLinks.find((l) => l.text.toLowerCase().includes("cutting wheels") || l.text.toLowerCase().includes("rolls"));

  console.log("Selected product link:", prodLink);

  if (prodLink) {
    await page.goto(prodLink.href, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    console.log("\n--- L3 URL:", page.url(), "Title:", await page.title());

    const l3Data = await page.evaluate(() => {
      // Look for suppliers / companies listed
      const companyElements = Array.from(
        document.querySelectorAll("h2, h3, h4, .company-name, [class*='company'], [class*='supplier']")
      ).map((el) => ({ tag: el.tagName, text: el.innerText.trim(), class: el.className })).filter((e) => e.text.length > 3);

      const contactButtons = Array.from(document.querySelectorAll("button, a, input"))
        .map((el) => ({
          tag: el.tagName,
          text: el.innerText ? el.innerText.trim() : (el.value || ""),
          href: el.href || "",
          onclick: el.getAttribute("onclick") || "",
          dataAttributes: Array.from(el.attributes)
            .filter((a) => a.name.startsWith("data-"))
            .map((a) => `${a.name}=${a.value}`),
        }))
        .filter(
          (b) =>
            b.text.toLowerCase().includes("contact") ||
            b.text.toLowerCase().includes("view") ||
            b.text.toLowerCase().includes("phone") ||
            b.text.toLowerCase().includes("mobile") ||
            b.text.toLowerCase().includes("inquiry") ||
            b.onclick.length > 0 ||
            b.dataAttributes.length > 0
        );

      const pagination = Array.from(document.querySelectorAll("a"))
        .map((a) => ({ text: a.innerText.trim(), href: a.href }))
        .filter(
          (l) =>
            l.text.match(/^[0-9]+$/) ||
            l.text.toLowerCase().includes("next") ||
            l.href.includes("page=") ||
            l.href.includes("pg=")
        );

      // Check for scripts containing JSON data or phone data
      const scriptSnippets = Array.from(document.querySelectorAll("script:not([src])"))
        .map((s) => s.innerText)
        .filter((t) => t.includes("phone") || t.includes("mobile") || t.includes("contact") || t.includes("email") || t.includes("company"))
        .map((t) => t.slice(0, 300));

      return {
        companyElements: companyElements.slice(0, 15),
        contactButtons: contactButtons.slice(0, 15),
        pagination,
        scriptSnippetsCount: scriptSnippets.length,
        bodySnippet: document.body.innerText.slice(0, 2500),
      };
    });

    console.log("L3 Company Headings:", l3Data.companyElements);
    console.log("L3 Contact Buttons & Masked Triggers:", l3Data.contactButtons);
    console.log("L3 Pagination Links:", l3Data.pagination);
    console.log("L3 Script snippets count:", l3Data.scriptSnippetsCount);
    console.log("\nL3 Body Snippet:\n", l3Data.bodySnippet);
  }

  await browser.close();
}

run().catch((e) => console.error(e));

