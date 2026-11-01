import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export interface GoogleMapsSearchOptions {
  query: string;
  category?: string;
  country?: string;
  state?: string;
  city?: string;
  minRating?: number;
  minReviews?: number;
  mustHavePhone?: boolean;
  mustHaveWebsite?: boolean;
  limit?: number;
  onProgress?: (log: { level: "info" | "warn" | "error" | "success"; message: string }) => void;
}

export interface GoogleMapsPlaceRecord {
  id: string;
  name: string;
  category: string;
  rating?: number;
  reviewCount?: number;
  phone?: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  website?: string;
  mapsUrl: string;
  operatingHours?: string;
  scrapedAt: string;
}

export class GoogleMapsScraperEngine {
  private static userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

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
      userAgent: GoogleMapsScraperEngine.userAgent,
      viewport: { width: 1920, height: 1080 },
      locale: "en-US",
      extraHTTPHeaders: {
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    const page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    return { context, page };
  }

  /**
   * High-throughput Google Maps Search & Place Intelligence Harvester
   */
  async searchAndScrape(options: GoogleMapsSearchOptions): Promise<GoogleMapsPlaceRecord[]> {
    const log = options.onProgress || (() => {});
    const targetLimit = options.limit || 50;

    // Assemble localized search query
    const parts = [
      options.query.trim(),
      options.category?.trim(),
      options.city?.trim(),
      options.state?.trim(),
      options.country?.trim() || "India",
    ].filter(Boolean);

    const fullSearchQuery = parts.join(" ");
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(fullSearchQuery)}?hl=en`;

    log({
      level: "info",
      message: `[Google Maps Engine] Initiating localized search: "${fullSearchQuery}" (Target Limit: ${targetLimit})`,
    });

    const browser = await this.launchStealthBrowser();
    const results: GoogleMapsPlaceRecord[] = [];

    try {
      const { page } = await this.createStealthPage(browser);

      log({ level: "info", message: `[Google Maps Engine] Navigating to Google Maps search portal...` });
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 40000 });
      await page.waitForTimeout(3000);

      // Handle cookie consent banners if present
      try {
        const consent = await page.$("button[aria-label*='Accept all'], form[action*='consent'] button");
        if (consent) {
          await consent.click();
          await page.waitForTimeout(1500);
        }
      } catch {}

      const feedSelector = 'div[role="feed"]';
      await page.waitForSelector(feedSelector, { timeout: 15000 }).catch(() => {});

      const feedExists = (await page.$(feedSelector)) !== null;
      if (!feedExists) {
        log({
          level: "warn",
          message: "No multi-listing feed found. Checking if single direct place was resolved...",
        });
        const singlePlace = await this.extractSinglePlaceDirect(page, searchUrl, options);
        if (singlePlace) results.push(singlePlace);
        return results;
      }

      log({ level: "info", message: "Google Maps results feed located. Commencing continuous feed traversal..." });

      // Continuously scroll the feed container to load places
      let scrollCycles = 0;
      const maxCycles = Math.max(15, Math.ceil(targetLimit / 5));
      let noNewItemsCycles = 0;
      const seenTitles = new Set<string>();

      while (results.length < targetLimit && scrollCycles < maxCycles && noNewItemsCycles < 4) {
        scrollCycles++;

        // Extract visible place cards from the feed
        const rawCards = await page.$$eval(
          'div[role="feed"] > div > div[role="article"], div[role="feed"] a[href*="/maps/place/"]',
          (els) => {
            return els.map((el) => {
              const a = el.tagName === "A" ? el : el.querySelector('a[href*="/maps/place/"]');
              const href = a ? (a as HTMLAnchorElement).href : "";
              const title = a
                ? a.getAttribute("aria-label") || (a as HTMLElement).innerText.split("\n")[0]
                : (el as HTMLElement).innerText.split("\n")[0];
              const cardText = (el as HTMLElement).innerText || "";
              return { title: title.trim(), href, cardText };
            }).filter((x) => x.title && x.title.length > 2);
          }
        );

        let addedInCycle = 0;

        for (const card of rawCards) {
          if (results.length >= targetLimit) break;
          if (seenTitles.has(card.title.toLowerCase())) continue;
          seenTitles.add(card.title.toLowerCase());

          // Parse card text for inline fields
          const lines = card.cardText.split("\n").map((l) => l.trim()).filter(Boolean);

          // Rating & Reviews (e.g. "4.8(330)")
          let rating: number | undefined;
          let reviewCount: number | undefined;
          const ratingMatch = card.cardText.match(/(\d\.\d)\s*\(([\d,]+)\)/);
          if (ratingMatch) {
            rating = parseFloat(ratingMatch[1]);
            reviewCount = parseInt(ratingMatch[2].replace(/,/g, ""), 10);
          }

          // Category & Address lines
          let detectedCategory = options.category || "";
          let detectedAddress = "";
          for (const line of lines) {
            if (line.includes("·") && !detectedCategory) {
              const subparts = line.split("·").map((s) => s.trim());
              detectedCategory = subparts[0] || "";
              if (subparts[1]) detectedAddress = subparts[1];
            } else if (line.match(/(?:Mumbai|Pune|Thane|Road|Street|MIDC|Acre|Compound|\d{6})/i) && !detectedAddress) {
              detectedAddress = line;
            }
          }

          // Phone detection from card text
          let phone = "";
          const phoneMatch = card.cardText.match(/(?:\+91[-\s]?)?[6-9]\d{4}\s?\d{5}|0\d{2,4}\s?\d{6,8}/);
          if (phoneMatch) {
            phone = phoneMatch[0].trim();
          }

          // Check if Website button exists on this card
          const hasWebsiteInline = card.cardText.includes("Website");

          // Apply filters
          if (options.minRating && rating !== undefined && rating < options.minRating) continue;
          if (options.minReviews && reviewCount !== undefined && reviewCount < options.minReviews) continue;
          if (options.mustHavePhone && !phone) continue;

          // Build Record
          const record: GoogleMapsPlaceRecord = {
            id: `gmap_${Date.now()}_${results.length + 1}`,
            name: card.title,
            category: detectedCategory || options.category || "Business",
            rating,
            reviewCount,
            phone,
            address: detectedAddress || `${options.city || ""}, ${options.state || "Maharashtra"}, India`.trim(),
            city: options.city,
            state: options.state,
            country: options.country || "India",
            website: undefined,
            mapsUrl: card.href || searchUrl,
            scrapedAt: new Date().toISOString(),
          };

          results.push(record);
          addedInCycle++;
        }

        if (addedInCycle === 0) {
          noNewItemsCycles++;
        } else {
          noNewItemsCycles = 0;
          log({
            level: "info",
            message: `[Google Maps Engine] Traversed feed scroll cycle ${scrollCycles}: Harvested ${results.length}/${targetLimit} matching business listings.`,
          });
        }

        // Scroll the feed container downwards
        await page.$eval(feedSelector, (el) => el.scrollBy(0, 1800)).catch(() => {});
        await page.waitForTimeout(2000);

        // Check if reached the end of Google Maps feed
        const isEnd = await page.evaluate(() => {
          return document.body.innerText.includes("You've reached the end of the list");
        });
        if (isEnd) {
          log({ level: "info", message: "Reached end of Google Maps listing feed." });
          break;
        }
      }

      // Step 2: Deep detail inspection for official website and exact addresses on top places
      const needsInspection = results.filter((r) => !r.website && r.mapsUrl && r.mapsUrl.includes("/maps/place/"));
      const inspectLimit = Math.min(needsInspection.length, 25);

      if (inspectLimit > 0) {
        log({
          level: "info",
          message: `[Google Maps Engine] Auditing place detail panels to extract official websites & full postal addresses (${inspectLimit} items)...`,
        });

        for (let i = 0; i < inspectLimit; i++) {
          const item = needsInspection[i];
          try {
            await page.goto(item.mapsUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
            await page.waitForTimeout(1500);

            const details = await page.evaluate(() => {
              const websiteLink = document.querySelector('a[data-item-id="authority"]');
              const website = websiteLink ? (websiteLink as HTMLAnchorElement).href : "";

              const phoneBtn = document.querySelector('button[data-item-id*="phone"]');
              const phone = phoneBtn ? phoneBtn.textContent?.replace(/[^\d+ ]/g, "").trim() : "";

              const addressBtn = document.querySelector('button[data-item-id*="address"]');
              const address = addressBtn ? addressBtn.textContent?.replace(/\n/g, " ").trim() : "";

              return { website, phone, address };
            });

            if (details.website) item.website = details.website;
            if (details.phone && !item.phone) item.phone = details.phone;
            if (details.address && details.address.length > 5) item.address = details.address;
          } catch {
            // Keep existing card values if individual detail fetch times out
          }
        }
      }

      log({
        level: "success",
        message: `[Google Maps Engine] Scraping complete! Total high-fidelity places extracted: ${results.length}`,
      });

      return results;
    } finally {
      await browser.close();
    }
  }

  private async extractSinglePlaceDirect(
    page: Page,
    searchUrl: string,
    options: GoogleMapsSearchOptions
  ): Promise<GoogleMapsPlaceRecord | null> {
    try {
      const details = await page.evaluate(() => {
        const name = document.querySelector("h1")?.textContent?.trim() || "";
        const ratingText = document.querySelector('span[aria-label*="star"], span[aria-label*="stars"]')?.getAttribute("aria-label") || "";
        const reviewsText = document.querySelector('span[aria-label*="reviews"]')?.getAttribute("aria-label") || "";
        const category = document.querySelector('button[jsaction*="category"]')?.textContent?.trim() || "";

        const phoneBtn = document.querySelector('button[data-item-id*="phone"]');
        const phone = phoneBtn ? phoneBtn.textContent?.replace(/[^\d+ ]/g, "").trim() : "";

        const addressBtn = document.querySelector('button[data-item-id*="address"]');
        const address = addressBtn ? addressBtn.textContent?.replace(/\n/g, " ").trim() : "";

        const websiteLink = document.querySelector('a[data-item-id="authority"]');
        const website = websiteLink ? (websiteLink as HTMLAnchorElement).href : "";

        return { name, ratingText, reviewsText, category, phone, address, website };
      });

      if (!details.name) return null;

      const ratingMatch = details.ratingText.match(/(\d\.\d)/);
      const reviewsMatch = details.reviewsText.match(/(\d+)/);

      return {
        id: `gmap_${Date.now()}_1`,
        name: details.name,
        category: details.category || options.category || "Business",
        rating: ratingMatch ? parseFloat(ratingMatch[1]) : undefined,
        reviewCount: reviewsMatch ? parseInt(reviewsMatch[1], 10) : undefined,
        phone: details.phone,
        address: details.address || `${options.city || ""}, ${options.state || ""}`.trim(),
        city: options.city,
        state: options.state,
        country: options.country || "India",
        website: details.website || undefined,
        mapsUrl: page.url() || searchUrl,
        scrapedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }
}

