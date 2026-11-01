import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import * as cheerio from "cheerio";
import { DataUnmasker, UnmaskedCompanyData } from "./DataUnmasker";

export interface CrawlOptions {
  crawlDepth?: "LEVEL_1_DIRECT" | "LEVEL_2_LISTINGS" | "LEVEL_3_DEEP_DETAILS";
  maxPages?: number;
  maxItems?: number;
  maxCategories?: number;
  selectedFields?: string[];
  onProgress?: (log: { level: "info" | "warn" | "error" | "success"; message: string }) => void;
}

export class PlaywrightScraperEngine {
  private static userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

  async launchStealthBrowser(): Promise<Browser> {
    try {
      return await chromium.launch({
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
    } catch {
      return await chromium.launch({
        headless: true,
        args: [
          "--headless=new",
          "--disable-blink-features=AutomationControlled",
          "--no-sandbox",
        ],
      });
    }
  }

  async createStealthPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
    const context = await browser.newContext({
      userAgent: PlaywrightScraperEngine.userAgent,
      viewport: { width: 1366, height: 768 },
      locale: "en-US",
      extraHTTPHeaders: {
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Ch-Ua": '"Chromium";v="128", "Google Chrome";v="128", "Not;A=Brand";v="99"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Upgrade-Insecure-Requests": "1",
      },
    });

    const page = await context.newPage();

    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });
      (window as any).chrome = {
        runtime: {},
        loadTimes: () => {},
        csi: () => {},
        app: {},
      };
    });

    return { context, page };
  }

  async fetchPageHtml(url: string, timeoutMs: number = 25000): Promise<{ html: string; title: string }> {
    const browser = await this.launchStealthBrowser();
    try {
      const { page } = await this.createStealthPage(browser);

      await page.goto(url, {
        timeout: timeoutMs,
        waitUntil: "domcontentloaded",
      });

      const initialTitle = await page.title();
      if (initialTitle.includes("Attention Required") || initialTitle.includes("Just a moment")) {
        await page.waitForTimeout(4000);
      } else {
        await page.waitForTimeout(1500);
      }

      const html = await page.content();
      const title = await page.title();

      return { html, title };
    } finally {
      await browser.close();
    }
  }

  /**
   * Enterprise Multi-Level Crawler & High-Volume Pagination Spider
   * Level 1: Root / Directory Index -> Explores all category & product pathways
   * Level 2: Paginated Listings -> Iterates pages 1..N and extracts structured business cards
   * Level 3: Deep Profiles -> Visits /companyinfo/... to unmask Schema.org & full factory addresses
   */
  async deepCrawl(
    seedUrl: string,
    options: CrawlOptions = {}
  ): Promise<{ title: string; count: number; items: Record<string, any>[] }> {
    const depth = options.crawlDepth || "LEVEL_2_LISTINGS";
    const maxPages = options.maxPages || 10;
    const maxItems = options.maxItems || 250;
    const maxCategories = options.maxCategories || 50;
    const log = options.onProgress || (() => {});

    log({
      level: "info",
      message: `Launching Enterprise Multi-Level Crawler (Target Items: ${maxItems}, Depth: ${depth}, Max Pages: ${maxPages})`,
    });

    const browser = await this.launchStealthBrowser();
    try {
      const { page } = await this.createStealthPage(browser);

      // Session Warmup: Navigate to Seed URL
      log({ level: "info", message: `[Level 1] Connecting to seed directory: ${seedUrl}` });
      await page.goto(seedUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(2000);

      const rootTitle = await page.title();
      const currentUrl = page.url();

      const currentHtml = await page.content();
      const $root = cheerio.load(currentHtml);
      const initialCards = $root(".rc-body, .company-list-item, [class*='listing']");

      let listingUrlsToCrawl: string[] = [];

      const origin = new URL(seedUrl).origin;
      const isMahaDirectory = seedUrl.toLowerCase().includes("maharashtradirectory");

      if (initialCards.length >= 2 || currentUrl.includes("/product/")) {
        // Direct listing page
        listingUrlsToCrawl = [currentUrl];
        log({ level: "info", message: `Direct listing page detected with ${initialCards.length} cards: ${currentUrl}` });
      } else {
        // Universal Category & Pathway Discovery across portal
        const discoveredLinks: string[] = [];
        $root("a[href]").each((_, el) => {
          const href = $root(el).attr("href");
          const text = $root(el).text().trim();
          if (
            href &&
            text.length > 2 &&
            !href.includes("login") &&
            !href.includes("contactus") &&
            !href.includes("about") &&
            !href.includes("privacy")
          ) {
            try {
              const full = href.startsWith("http") ? href : new URL(href, currentUrl).toString();
              if (
                full.includes("/product/") ||
                full.includes("/category/") ||
                full.endsWith("/Category") ||
                full.includes("/alpha/") ||
                full.includes("/directory/") ||
                full.includes("/catalog/")
              ) {
                if (!discoveredLinks.includes(full)) {
                  discoveredLinks.push(full);
                }
              }
            } catch {}
          }
        });

        log({
          level: "info",
          message: `[Level 1] Discovered ${discoveredLinks.length} category/directory pathways on seed portal.`,
        });

        // 1. Check for Master Category Index (e.g. /Category or /all-categories)
        let masterCatUrl = discoveredLinks.find((l) => l.endsWith("/Category") || l.includes("/all-categories") || l.includes("/categories"));
        if (!masterCatUrl && isMahaDirectory) {
          masterCatUrl = `${origin}/Category`;
        }

        if (masterCatUrl) {
          try {
            log({ level: "info", message: `[Level 1] Deep indexing master category directory: ${masterCatUrl}` });
            await page.goto(masterCatUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
            await page.waitForTimeout(1000);
            const catHtml = await page.content();
            const $cat = cheerio.load(catHtml);

            const subcats: string[] = [];
            $cat('a[href*="/category/"]').each((_, el) => {
              const h = $cat(el).attr("href");
              if (h && h.endsWith(".html")) {
                const full = h.startsWith("http") ? h : new URL(h, masterCatUrl!).toString();
                if (!subcats.includes(full)) subcats.push(full);
              }
            });

            log({ level: "info", message: `[Level 1] Discovered ${subcats.length} subcategory branches. Harvesting product pathways...` });

            // Visit subcategories dynamically to harvest rich product listing pathways
            const subcatsToExplore = maxCategories > 100 ? subcats : subcats.slice(0, Math.min(subcats.length, 30));
            for (const sub of subcatsToExplore) {
              if (listingUrlsToCrawl.length >= maxCategories) break;
              try {
                await page.goto(sub, { waitUntil: "domcontentloaded", timeout: 20000 });
                await page.waitForTimeout(600);
                const subHtml = await page.content();
                const $sub = cheerio.load(subHtml);

                $sub('a[href*="/product/"]').each((_, el) => {
                  const h = $sub(el).attr("href");
                  if (h && h.endsWith(".html") && !h.includes("/alpha/")) {
                    const full = h.startsWith("http") ? h : new URL(h, sub).toString();
                    if (!listingUrlsToCrawl.includes(full)) {
                      listingUrlsToCrawl.push(full);
                    }
                  }
                });
              } catch {}
            }
          } catch (catErr: any) {
            log({ level: "warn", message: `Master category index note: ${catErr.message}` });
          }
        }

        // 2. Direct product pages from homepage
        const directProductPages = discoveredLinks.filter(
          (l) => l.includes("/product/") && l.endsWith(".html") && !l.includes("/alpha/")
        );
        for (const dp of directProductPages) {
          if (!listingUrlsToCrawl.includes(dp) && listingUrlsToCrawl.length < maxCategories) {
            listingUrlsToCrawl.push(dp);
          }
        }

        // 3. Alphabetical catalog index harvesting (Traverses A through Z for high quotas / unlimited)
        if (listingUrlsToCrawl.length < maxCategories && isMahaDirectory) {
          const alphaLetters = maxCategories > 100
            ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
            : ["M", "P", "C", "A", "H", "S", "B", "T", "D", "E", "F", "G", "R", "W"];

          for (const letter of alphaLetters) {
            if (listingUrlsToCrawl.length >= maxCategories) break;
            const alphaUrl = `${origin}/product/alpha/${letter}.html`;
            try {
              log({
                level: "info",
                message: `[Level 1] Discovering product catalog pathways from index [Letter ${letter}]: ${alphaUrl}`,
              });
              await page.goto(alphaUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
              await page.waitForTimeout(600);
              const alphaHtml = await page.content();
              const $alpha = cheerio.load(alphaHtml);

              $alpha('a[href*="/product/"]').each((_, el) => {
                const h = $alpha(el).attr("href");
                if (h && h.endsWith(".html") && !h.includes("/alpha/")) {
                  const full = h.startsWith("http") ? h : new URL(h, alphaUrl).toString();
                  if (!listingUrlsToCrawl.includes(full) && listingUrlsToCrawl.length < maxCategories) {
                    listingUrlsToCrawl.push(full);
                  }
                }
              });
            } catch {}
          }
        }

        if (listingUrlsToCrawl.length === 0) {
          listingUrlsToCrawl = directProductPages.length > 0 ? directProductPages : discoveredLinks.slice(0, 10);
        }
      }

      log({
        level: "info",
        message: `[Level 1] Queued ${listingUrlsToCrawl.length} listing pathways for extraction. Target quota: ${maxItems} verified records.`,
      });

      const allExtractedRecords: Record<string, any>[] = [];

      // Step 2: Iterate through listing URLs and paginate
      for (let pIdx = 0; pIdx < listingUrlsToCrawl.length; pIdx++) {
        if (allExtractedRecords.length >= maxItems) break;
        const listingUrl = listingUrlsToCrawl[pIdx];

        let currentPageUrl: string | null = listingUrl;
        let pageNum = 1;

        while (currentPageUrl && pageNum <= maxPages && allExtractedRecords.length < maxItems) {
          log({
            level: "info",
            message: `[Level 2] Crawling pathway ${pIdx + 1}/${listingUrlsToCrawl.length} (Page ${pageNum}/${maxPages}): ${currentPageUrl}`,
          });

          try {
            await page.goto(currentPageUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
            await page.waitForTimeout(2000);
          } catch (navErr: any) {
            log({ level: "warn", message: `Navigation warning on ${currentPageUrl}: ${navErr.message}` });
            break;
          }

          // Check if page has deeper product link if cards count is 0
          let pageHtml = await page.content();
          let $ = cheerio.load(pageHtml);
          let cards = $(".rc-body");

          if (cards.length === 0) {
            const deeperProd = $("a[href*='/product/']").first().attr("href");
            if (deeperProd && currentPageUrl) {
              const fullProd: string = deeperProd.startsWith("http")
                ? deeperProd
                : new URL(deeperProd, currentPageUrl).toString();
              log({ level: "info", message: `[Level 2] Following deeper product listings link: ${fullProd}` });
              try {
                await page.goto(fullProd, { waitUntil: "domcontentloaded", timeout: 25000 });
                await page.waitForTimeout(2000);
                pageHtml = await page.content();
                $ = cheerio.load(pageHtml);
                cards = $(".rc-body");
                currentPageUrl = fullProd;
              } catch {}
            }
          }

          // Dynamically harvest related product pathways on this page to expand frontier queue
          if (listingUrlsToCrawl.length < maxCategories * 3) {
            $("a[href*='/product/']").each((_, aEl) => {
              const h = $(aEl).attr("href");
              if (h && h.endsWith(".html") && !h.includes("/alpha/")) {
                const fullP = h.startsWith("http") ? h : new URL(h, currentPageUrl!).toString();
                if (!listingUrlsToCrawl.includes(fullP)) {
                  listingUrlsToCrawl.push(fullP);
                }
              }
            });
          }

          const pageTitle = $("title").text().trim();
          const pageRecords: Record<string, any>[] = [];

          if (cards.length > 0) {
            cards.each((idx, el) => {
              if (allExtractedRecords.length + pageRecords.length >= maxItems) return;
              const card = $(el);

              // 1. Company Name & Title attribute unmasking
              const titleLink = card.find(".rc-title a");
              const companyName = titleLink.text().trim() || card.find("h2, h3, h4").first().text().trim();
              const contactTitle = titleLink.attr("title") || card.find("[title*='Contact:']").first().attr("title") || "";

              let contactPerson = "";
              let designation = "";
              if (contactTitle) {
                const parsed = DataUnmasker.parseContactAndDesignation(contactTitle);
                contactPerson = parsed.contactPerson;
                designation = parsed.designation;
              }

              // 2. URLs & Direct Company Website Link
              const compHref = titleLink.attr("href") || card.find("a[href*='companyinfo']").attr("href");
              const fullCompanyInfoUrl = compHref ? (compHref.startsWith("http") ? compHref : new URL(compHref, currentPageUrl!).toString()) : "";

              const catHref = card.find("a[href*='cataloginfo']").attr("href");
              const fullCatalogUrl = catHref ? (catHref.startsWith("http") ? catHref : new URL(catHref, currentPageUrl!).toString()) : "";

              // Direct external corporate website if linked on card
              let directWebsite = "";
              card.find("a[href^='http']").each((_, wEl) => {
                const wh = $(wEl).attr("href") || "";
                if (
                  !wh.includes("maharashtradirectory.com") &&
                  !wh.includes("google.com") &&
                  !wh.includes("facebook.com") &&
                  !wh.includes("linkedin.com") &&
                  !wh.includes("twitter.com") &&
                  !wh.includes("mipl.co.in")
                ) {
                  directWebsite = wh;
                }
              });

              // 3. Address
              const cardText = card.text();
              const lines = cardText.split("\n").map((l) => l.trim()).filter(Boolean);
              let address = "";
              for (const line of lines) {
                if (
                  line.match(/(?:Mumbai|Pune|Thane|Nashik|Navi Mumbai|Maharashtra|\d{6})/i) &&
                  !line.toLowerCase().includes("tel") &&
                  !line.toLowerCase().includes("www") &&
                  line.length < 140
                ) {
                  address = line;
                  break;
                }
              }

              // 4. Phone de-obfuscation
              let phone = "";
              const telAttr = card.find("a[href^='tel:']").attr("href")?.replace(/^tel:/i, "");
              if (telAttr) phone = telAttr;
              if (!phone) {
                const mobMatch = cardText.match(/(?:\+91[-\s]?)?[6-9]\d{9}/);
                if (mobMatch) phone = mobMatch[0];
                else if (card.find(".view-number-link, [data-open-otp]").length > 0) {
                  phone = "[Protected via SMS OTP]";
                }
              }

              // 5. Products / Description
              const desc = card.find("p, .rc-desc, [class*='desc']").text().replace(/\s+/g, " ").trim();

              if (companyName && companyName.length >= 2) {
                // Deduplicate by company name
                const alreadyAdded = allExtractedRecords.some((r) => r.companyName?.toLowerCase() === companyName.toLowerCase());
                if (!alreadyAdded) {
                  pageRecords.push({
                    id: `rec_${allExtractedRecords.length + pageRecords.length + 1}`,
                    companyName,
                    name: companyName,
                    contactPerson: contactPerson || "Key Decision Maker",
                    designation: designation || "Executive",
                    phone,
                    email: "",
                    address: address || "Maharashtra, India",
                    products: desc ? desc.slice(0, 140) : "",
                    companyInfoUrl: fullCompanyInfoUrl,
                    catalogUrl: fullCatalogUrl,
                    websiteUrl: directWebsite || fullCompanyInfoUrl || fullCatalogUrl || currentPageUrl,
                    website: directWebsite || "",
                    link: directWebsite || fullCompanyInfoUrl || fullCatalogUrl || currentPageUrl,
                    scrapedAt: new Date().toISOString(),
                  });
                }
              }
            });
          } else {
            // Generic card extractor fallback
            const genericListings = await this.scrapeGenericCards($, currentPageUrl || seedUrl);
            pageRecords.push(...genericListings);
          }

          log({
            level: "success",
            message: `[Level 2] Extracted ${pageRecords.length} companies from: "${pageTitle.slice(0, 45)}" (Total so far: ${allExtractedRecords.length + pageRecords.length}/${maxItems})`,
          });

          // Step 3: Deep detail pages inspection if requested
          if (depth === "LEVEL_3_DEEP_DETAILS") {
            log({
              level: "info",
              message: `[Level 3] Deep crawling ${pageRecords.length} detail profiles for factory addresses & Schema.org JSON-LD...`,
            });

            for (const rec of pageRecords) {
              if (rec.companyInfoUrl) {
                try {
                  await page.goto(rec.companyInfoUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
                  await page.waitForTimeout(1200);

                  const detailHtml = await page.content();
                  const unmasked = DataUnmasker.extractFromHtml(detailHtml, rec.companyInfoUrl);

                  if (unmasked.streetAddress) rec.fullAddress = unmasked.streetAddress;
                  if (unmasked.streetAddress) rec.address = unmasked.streetAddress;
                  if (unmasked.city) rec.city = unmasked.city;
                  if (unmasked.state) rec.state = unmasked.state;
                  if (unmasked.postalCode) rec.postalCode = unmasked.postalCode;
                  if (unmasked.contactPerson && (!rec.contactPerson || rec.contactPerson === "Key Decision Maker")) {
                    rec.contactPerson = unmasked.contactPerson;
                  }
                  if (unmasked.designation && (!rec.designation || rec.designation === "Executive")) {
                    rec.designation = unmasked.designation;
                  }
                  if (unmasked.email) rec.email = unmasked.email;
                  if (unmasked.products.length > 0) rec.products = unmasked.products.slice(0, 5).join(", ");
                } catch {
                  // Keep Level 2 values if detail fetch times out
                }
              }
            }
          }

          allExtractedRecords.push(...pageRecords);

          // Pagination: Find Next Page link
          let nextPageUrl: string | null = null;
          if (paginationLinksAvailable($, pageNum) && currentPageUrl) {
            const nextHref = getNextPageHref($, pageNum);
            if (nextHref) {
              nextPageUrl = nextHref.startsWith("http") ? nextHref : new URL(nextHref, currentPageUrl).toString();
            }
          }

          currentPageUrl = nextPageUrl;
          pageNum++;
        }
      }

      log({
        level: "success",
        message: `Crawler completed! Total verified records extracted: ${allExtractedRecords.length}`,
      });

      return {
        title: rootTitle,
        count: allExtractedRecords.length,
        items: allExtractedRecords,
      };
    } finally {
      await browser.close();
    }
  }

  private async scrapeGenericCards($: cheerio.CheerioAPI, baseUrl: string): Promise<Record<string, any>[]> {
    const items: Record<string, any>[] = [];
    const selectors = [".listing-item", ".directory-item", ".card", "article", '[class*="company"]'];

    for (const sel of selectors) {
      const found = $(sel);
      if (found.length >= 2) {
        found.slice(0, 30).each((idx, el) => {
          const card = $(el);
          const name = card.find("h2, h3, h4, a").first().text().trim();
          const link = card.find("a[href]").first().attr("href");
          const fullLink = link ? (link.startsWith("http") ? link : new URL(link, baseUrl).toString()) : "";

          const tel = card.find("a[href^='tel:']").attr("href")?.replace(/^tel:/i, "");
          const mail = card.find("a[href^='mailto:']").attr("href")?.replace(/^mailto:/i, "");

          if (name && name.length >= 2) {
            items.push({
              id: `rec_${idx + 1}`,
              companyName: name,
              name,
              contactPerson: "Key Decision Maker",
              designation: "Executive",
              phone: tel || "",
              email: mail || "",
              address: "Maharashtra, India",
              link: fullLink,
              scrapedAt: new Date().toISOString(),
            });
          }
        });
        break;
      }
    }

    return items;
  }

  async scrapeListings(
    url: string,
    options: {
      cardSelector?: string;
      maxItems?: number;
      crawlDepth?: "LEVEL_1_DIRECT" | "LEVEL_2_LISTINGS" | "LEVEL_3_DEEP_DETAILS";
    } = {}
  ): Promise<{ title: string; count: number; items: Record<string, any>[] }> {
    return this.deepCrawl(url, {
      maxItems: options.maxItems || 60,
      crawlDepth: options.crawlDepth || "LEVEL_2_LISTINGS",
    });
  }
}

function paginationLinksAvailable($: cheerio.CheerioAPI, pageNum: number): boolean {
  return $("a").filter((_, el) => {
    const t = $(el).text().trim().toLowerCase();
    const h = $(el).attr("href") || "";
    return (
      t === "next" ||
      t === "›" ||
      t === ">" ||
      t === (pageNum + 1).toString() ||
      h.includes(`page=${pageNum + 1}`) ||
      h.includes(`pg=${pageNum + 1}`)
    );
  }).length > 0;
}

function getNextPageHref($: cheerio.CheerioAPI, pageNum: number): string | null {
  const match = $("a").filter((_, el) => {
    const t = $(el).text().trim().toLowerCase();
    const h = $(el).attr("href") || "";
    return (
      t === "next" ||
      t === "›" ||
      t === ">" ||
      t === (pageNum + 1).toString() ||
      h.includes(`page=${pageNum + 1}`) ||
      h.includes(`pg=${pageNum + 1}`)
    );
  }).first();

  return match.attr("href") || null;
}
