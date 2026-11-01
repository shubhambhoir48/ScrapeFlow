import * as cheerio from "cheerio";
import { IDomInspector } from "../../core/interfaces/IScraperProvider";
import { DetectedField } from "../../core/models/ScraperConfig";
import { PlaywrightScraperEngine } from "./PlaywrightScraperEngine";

export class SmartFieldDetector implements IDomInspector {
  private playwrightEngine = new PlaywrightScraperEngine();

  async inspectUrl(targetUrl: string): Promise<{
    title: string;
    description?: string;
    detectedFields: DetectedField[];
    jsonLdSchemas?: any[];
  }> {
    let url = targetUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }

    let html = "";
    let pageTitle = "";

    // 1. Try Fast Fetch with authentic Chrome headers
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Upgrade-Insecure-Requests": "1",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        html = await response.text();
      }
    } catch {
      // Proceed to Playwright fallback
    }

    // 2. If blocked by Cloudflare (403) or failed, use Playwright Stealth with system Chrome!
    if (!html || html.includes("Attention Required! | Cloudflare") || html.includes("Just a moment...")) {
      try {
        const result = await this.playwrightEngine.fetchPageHtml(url);
        html = result.html;
        pageTitle = result.title;
      } catch (pwErr: any) {
        if (!html) {
          throw new Error(`Unable to load URL: ${pwErr.message}`);
        }
      }
    }

    const $ = cheerio.load(html);

    if (!pageTitle) {
      pageTitle = $("title").text().trim() || new URL(url).hostname;
    }
    const metaDescription =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      "";

    const fields: DetectedField[] = [];
    const jsonLdSchemas: any[] = [];

    // JSON-LD Schemas
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const text = $(el).html();
        if (text) {
          jsonLdSchemas.push(JSON.parse(text));
        }
      } catch {}
    });

    // 1. Primary Heading (H1)
    const h1 = $("h1").first().text().trim();
    if (h1) {
      fields.push({
        id: "field_h1",
        name: "Main Title / Heading (H1)",
        selector: "h1",
        type: "text",
        sampleValue: h1.slice(0, 80),
        confidence: 0.98,
        selected: true,
      });
    }

    // 2. Section Subheadings (H2 / H3)
    const h2Sample = $("h2").first().text().trim();
    if (h2Sample) {
      fields.push({
        id: "field_h2",
        name: "Category / Section Titles (H2)",
        selector: "h2",
        type: "text",
        sampleValue: h2Sample.slice(0, 80),
        confidence: 0.92,
        selected: true,
      });
    }

    // 3. Repeating Listing Cards / Items
    const cardSelectors = [
      ".company-list-item",
      ".directory-item",
      ".product-card",
      ".item",
      ".card",
      "article",
      '[class*="list-item"]',
      '[class*="company"]',
      '[class*="item"]',
      '[class*="listing"]',
      "table tr",
    ];
    for (const selector of cardSelectors) {
      const elements = $(selector);
      if (elements.length >= 2) {
        const sample = elements.first().text().replace(/\s+/g, " ").trim();
        fields.push({
          id: `field_cards_${selector.replace(/[^a-zA-Z0-9]/g, "_")}`,
          name: `Listing Cards (${selector}) - Count: ${elements.length}`,
          selector: selector,
          type: "table",
          sampleValue: sample.slice(0, 100),
          confidence: 0.94,
          selected: true,
        });
        break;
      }
    }

    // 4. Contact Phone Numbers
    const phoneMatches = html.match(/(\+?[0-9]{1,4}[\s-]?)?\(?[0-9]{2,5}\)?[\s-]?[0-9]{3,4}[\s-]?[0-9]{3,4}/g);
    if (phoneMatches && phoneMatches.length > 0) {
      const validPhone = phoneMatches.find((p) => p.trim().length >= 8);
      if (validPhone) {
        fields.push({
          id: "field_phones",
          name: "Phone Numbers",
          selector: 'a[href^="tel:"], body',
          type: "text",
          sampleValue: validPhone.trim(),
          confidence: 0.95,
          selected: true,
        });
      }
    }

    // 5. Contact Emails
    const emailMatches = html.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
    if (emailMatches && emailMatches.length > 0) {
      fields.push({
        id: "field_emails",
        name: "Contact Email Addresses",
        selector: 'a[href^="mailto:"], body',
        type: "email",
        sampleValue: emailMatches[0],
        confidence: 0.96,
        selected: true,
      });
    }

    // 6. Navigation / Listing Links
    const links = $("a[href]").filter((_, el) => $(el).text().trim().length > 3);
    if (links.length > 0) {
      fields.push({
        id: "field_links",
        name: `Detail URLs & Links (${links.length} links)`,
        selector: "a[href]",
        type: "link",
        sampleValue: links.first().attr("href") || "",
        confidence: 0.9,
        selected: true,
      });
    }

    // 7. Pricing / Currency Elements
    let priceSample = "";
    $("*").each((_, el) => {
      if (priceSample) return;
      const text = $(el).children().length === 0 ? $(el).text().trim() : "";
      if (/^[$€£₹]\s*\d+([.,]\d{2})?$/.test(text) || /^\d+([.,]\d{2})?\s*[$€£₹]$/.test(text)) {
        priceSample = text;
      }
    });
    if (priceSample) {
      fields.push({
        id: "field_prices",
        name: "Pricing / Cost Elements",
        selector: ".price, [class*='price']",
        type: "price",
        sampleValue: priceSample,
        confidence: 0.93,
        selected: true,
      });
    }

    // 8. Images
    const firstImg = $("img[src]").first().attr("src");
    if (firstImg) {
      const fullImg = firstImg.startsWith("http") ? firstImg : new URL(firstImg, url).toString();
      fields.push({
        id: "field_images",
        name: "Logo & Product Images",
        selector: "img[src]",
        type: "image",
        sampleValue: fullImg,
        confidence: 0.88,
        selected: false,
      });
    }

    // 9. Data Tables
    if ($("table").length > 0) {
      fields.push({
        id: "field_tables",
        name: `Structured Tables (${$("table").length} found)`,
        selector: "table tr",
        type: "table",
        sampleValue: $("table tr").first().text().replace(/\s+/g, " ").trim().slice(0, 80),
        confidence: 0.95,
        selected: true,
      });
    }

    return {
      title: pageTitle,
      description: metaDescription,
      detectedFields: fields,
      jsonLdSchemas: jsonLdSchemas.slice(0, 3),
    };
  }

  async scrapeSelectedFields(targetUrl: string, selectedFields: DetectedField[]): Promise<Record<string, any>[]> {
    let html = "";
    try {
      const res = await fetch(targetUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        },
      });
      if (res.ok) html = await res.text();
    } catch {}

    if (!html || html.includes("Cloudflare")) {
      const res = await this.playwrightEngine.fetchPageHtml(targetUrl);
      html = res.html;
    }

    const $ = cheerio.load(html);

    // If repeating items were selected
    const cardField = selectedFields.find((f) => f.type === "table" && f.selector !== "table tr");
    if (cardField) {
      const results = await this.playwrightEngine.scrapeListings(targetUrl, { cardSelector: cardField.selector });
      if (results.items.length > 0) return results.items;
    }

    const record: Record<string, any> = {
      _sourceUrl: targetUrl,
      _scrapedAt: new Date().toISOString(),
    };

    for (const field of selectedFields) {
      if (field.type === "image") {
        const src = $(field.selector).first().attr("src");
        record[field.name] = src ? (src.startsWith("http") ? src : new URL(src, targetUrl).toString()) : "";
      } else if (field.type === "link") {
        record[field.name] = $(field.selector).first().attr("href") || "";
      } else {
        const text = $(field.selector).first().text().replace(/\s+/g, " ").trim();
        record[field.name] = text || field.sampleValue || "";
      }
    }

    return [record];
  }
}
