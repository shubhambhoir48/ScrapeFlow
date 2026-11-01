import * as cheerio from "cheerio";
import { IScraperProvider } from "../../core/interfaces/IScraperProvider";
import { Company, EmailRecord, PhoneRecord, AddressRecord } from "../../core/models/Company";

export class WebsiteContentScraper implements IScraperProvider {
  readonly name = "WebsiteContentScraper";

  async isHealthy(): Promise<boolean> {
    return true;
  }

  async scrape(targetUrl: string): Promise<Partial<Company>> {
    let url = targetUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return {
          websiteUrl: url,
          domain: new URL(url).hostname.replace(/^www\./, ""),
        };
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // 1. Meta & Title
      const pageTitle = $("title").text().trim() || "";
      const metaDescription =
        $('meta[name="description"]').attr("content") ||
        $('meta[property="og:description"]').attr("content") ||
        "";
      const ogSiteName = $('meta[property="og:site_name"]').attr("content");
      const cleanDomain = new URL(url).hostname.replace(/^www\./, "");
      const companyName = ogSiteName || pageTitle.split(/[-|—·]/)[0].trim() || cleanDomain;

      // 2. JSON-LD Extraction
      let jsonLdOrg: any = null;
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const content = $(el).html();
          if (content) {
            const parsed = JSON.parse(content);
            const items = Array.isArray(parsed) ? parsed : [parsed];
            for (const item of items) {
              if (
                item["@type"] === "Organization" ||
                item["@type"] === "Corporation" ||
                item["@type"] === "LocalBusiness"
              ) {
                jsonLdOrg = item;
                break;
              }
            }
          }
        } catch {
          // Ignore parse errors on malformed scripts
        }
      });

      // 3. Email Extraction (mailto + body regex)
      const foundEmails = new Set<string>();
      $('a[href^="mailto:"]').each((_, el) => {
        const href = $(el).attr("href");
        if (href) {
          const email = href.replace(/^mailto:/i, "").split("?")[0].trim();
          if (email && email.includes("@")) foundEmails.add(email.toLowerCase());
        }
      });

      const bodyText = $("body").text();
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const matches = bodyText.match(emailRegex) || [];
      for (const m of matches) {
        if (!m.endsWith(".png") && !m.endsWith(".jpg") && !m.endsWith(".webp")) {
          foundEmails.add(m.toLowerCase());
        }
      }

      const emails: EmailRecord[] = Array.from(foundEmails).slice(0, 5).map((address) => ({
        address,
        type: address.startsWith("info@") || address.startsWith("support@") ? "generic" : "corporate",
        mxVerified: false,
        confidenceScore: 0.8,
      }));

      // 4. Phone Extraction (tel: links + heuristics)
      const foundPhones = new Set<string>();
      $('a[href^="tel:"]').each((_, el) => {
        const href = $(el).attr("href");
        if (href) {
          const phone = href.replace(/^tel:/i, "").trim();
          if (phone.length >= 7) foundPhones.add(phone);
        }
      });

      const phones: PhoneRecord[] = Array.from(foundPhones).slice(0, 3).map((number) => ({
        number,
        source: "website",
        verified: true,
      }));

      // 5. Tech Stack Detection
      const techStack: string[] = [];
      const htmlLower = html.toLowerCase();
      if (htmlLower.includes("__next") || htmlLower.includes("/_next/")) techStack.push("Next.js");
      if (htmlLower.includes("react") || htmlLower.includes("react-dom")) techStack.push("React");
      if (htmlLower.includes("tailwind") || htmlLower.includes("tw-")) techStack.push("Tailwind CSS");
      if (htmlLower.includes("wordpress") || htmlLower.includes("wp-content")) techStack.push("WordPress");
      if (htmlLower.includes("shopify")) techStack.push("Shopify");
      if (htmlLower.includes("stripe.com/v3")) techStack.push("Stripe");
      if (htmlLower.includes("google-analytics") || htmlLower.includes("gtag")) techStack.push("Google Analytics");
      if (htmlLower.includes("intercom")) techStack.push("Intercom");
      if (htmlLower.includes("hubspot")) techStack.push("HubSpot");

      // 6. Address / Location hints
      const addresses: AddressRecord[] = [];
      if (jsonLdOrg && jsonLdOrg.address) {
        const a = jsonLdOrg.address;
        addresses.push({
          fullAddress: typeof a === "string" ? a : `${a.streetAddress || ""}, ${a.addressLocality || ""} ${a.addressRegion || ""}`.trim(),
          city: a.addressLocality,
          state: a.addressRegion,
          country: a.addressCountry,
          postalCode: a.postalCode,
        });
      }

      return {
        domain: cleanDomain,
        companyName: jsonLdOrg?.name || companyName,
        tagline: pageTitle,
        description: jsonLdOrg?.description || metaDescription,
        websiteUrl: url,
        emails,
        phones,
        addresses,
        techStack,
      };
    } catch {
      const cleanDomain = targetUrl.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];
      return {
        domain: cleanDomain,
        websiteUrl: targetUrl,
        companyName: cleanDomain.split(".")[0],
      };
    }
  }
}

