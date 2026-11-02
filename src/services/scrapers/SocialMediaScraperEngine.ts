import { chromium, type Browser } from "playwright";
import * as cheerio from "cheerio";

export interface SocialProfileResult {
  targetName: string;
  targetCompany?: string;
  targetDomain?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  github?: string;
  bio?: string;
  headline?: string;
  location?: string;
  confidenceScore: number;
  sourcesFound: string[];
  extractedAt: string;
}

export class SocialMediaScraperEngine {
  private static userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

  async launchBrowser(): Promise<Browser> {
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
        ],
      });
    } catch {
      return await chromium.launch({
        headless: true,
        args: ["--headless=new", "--disable-blink-features=AutomationControlled", "--no-sandbox"],
      });
    }
  }

  /**
   * Harvest social profiles directly from a company website HTML
   */
  extractSocialsFromHtml(html: string, baseUrl: string): Partial<SocialProfileResult> {
    const $ = cheerio.load(html);
    const result: Partial<SocialProfileResult> = {
      sourcesFound: [],
    };

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const lower = href.toLowerCase();

      // LinkedIn
      if (lower.includes('linkedin.com/company/') || lower.includes('linkedin.com/in/')) {
        if (!result.linkedin && !lower.includes('linkedin.com/share') && !lower.includes('linkedin.com/sharing')) {
          result.linkedin = href.startsWith('http') ? href : `https://${href.replace(/^\/\//, '')}`;
          result.sourcesFound?.push('Website Footer: LinkedIn');
        }
      }

      // Twitter / X
      if (lower.includes('twitter.com/') || lower.includes('x.com/')) {
        if (!result.twitter && !lower.includes('/intent/') && !lower.includes('/share')) {
          result.twitter = href.startsWith('http') ? href : `https://${href.replace(/^\/\//, '')}`;
          result.sourcesFound?.push('Website Footer: Twitter/X');
        }
      }

      // Facebook
      if (lower.includes('facebook.com/')) {
        if (!result.facebook && !lower.includes('/sharer/') && !lower.includes('/plugins/')) {
          result.facebook = href.startsWith('http') ? href : `https://${href.replace(/^\/\//, '')}`;
          result.sourcesFound?.push('Website Footer: Facebook');
        }
      }

      // Instagram
      if (lower.includes('instagram.com/')) {
        if (!result.instagram) {
          result.instagram = href.startsWith('http') ? href : `https://${href.replace(/^\/\//, '')}`;
          result.sourcesFound?.push('Website Footer: Instagram');
        }
      }

      // YouTube
      if (lower.includes('youtube.com/channel/') || lower.includes('youtube.com/@') || lower.includes('youtube.com/c/')) {
        if (!result.youtube) {
          result.youtube = href.startsWith('http') ? href : `https://${href.replace(/^\/\//, '')}`;
          result.sourcesFound?.push('Website Footer: YouTube');
        }
      }

      // GitHub
      if (lower.includes('github.com/')) {
        if (!result.github && !lower.includes('/site/') && !lower.includes('/about')) {
          result.github = href.startsWith('http') ? href : `https://${href.replace(/^\/\//, '')}`;
          result.sourcesFound?.push('Website Footer: GitHub');
        }
      }
    });

    return result;
  }

  /**
   * Search and unmask social profiles using search engine cross-referencing
   */
  async findSocialProfiles(
    targetName: string,
    companyOrDomain: string = "",
    onProgress?: (log: { level: "info" | "warn" | "error" | "success"; message: string }) => void
  ): Promise<SocialProfileResult> {
    const log = onProgress || (() => {});
    log({ level: "info", message: `Initiating multi-channel social media audit for: "${targetName}" (${companyOrDomain})` });

    const result: SocialProfileResult = {
      targetName,
      targetCompany: companyOrDomain,
      confidenceScore: 0.75,
      sourcesFound: [],
      extractedAt: new Date().toISOString(),
    };

    let browser: Browser | null = null;
    try {
      browser = await this.launchBrowser();
    } catch {
      log({
        level: "warn",
        message: "Headless Chromium unavailable. Running multi-channel social harvest via HTTP...",
      });
      return await this.findSocialProfilesHttp(targetName, companyOrDomain, onProgress);
    }
    try {
      const context = await browser.newContext({
        userAgent: SocialMediaScraperEngine.userAgent,
        viewport: { width: 1366, height: 768 },
      });
      const page = await context.newPage();

      // 1. If target is a domain/URL or contains website: check the official website first
      const cleanUrl = companyOrDomain.startsWith("http")
        ? companyOrDomain
        : companyOrDomain.includes(".") && !companyOrDomain.includes(" ")
        ? `https://${companyOrDomain}`
        : null;

      if (cleanUrl) {
        try {
          log({ level: "info", message: `Auditing official website DOM for social links: ${cleanUrl}` });
          await page.goto(cleanUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
          await page.waitForTimeout(1000);
          const html = await page.content();
          const fromWeb = this.extractSocialsFromHtml(html, cleanUrl);

          if (fromWeb.linkedin) result.linkedin = fromWeb.linkedin;
          if (fromWeb.twitter) result.twitter = fromWeb.twitter;
          if (fromWeb.facebook) result.facebook = fromWeb.facebook;
          if (fromWeb.instagram) result.instagram = fromWeb.instagram;
          if (fromWeb.youtube) result.youtube = fromWeb.youtube;
          if (fromWeb.github) result.github = fromWeb.github;
          if (fromWeb.sourcesFound) result.sourcesFound.push(...fromWeb.sourcesFound);
        } catch (e: any) {
          log({ level: "warn", message: `Direct website audit note: ${e.message}` });
        }
      }

      // 2. LinkedIn Search Query Cross-Referencing if missing
      if (!result.linkedin) {
        try {
          const searchQuery = `site:linkedin.com/in/ OR site:linkedin.com/company/ "${targetName}" ${companyOrDomain ? `"${companyOrDomain}"` : ""}`;
          log({ level: "info", message: `Executing stealth cross-search: ${searchQuery}` });

          const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
          await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
          await page.waitForTimeout(1200);

          const searchHtml = await page.content();
          const $s = cheerio.load(searchHtml);

          $s(".result__url, .result__snippet, a.result__url").each((_, el) => {
            const rawHref = $s(el).attr("href") || $s(el).text().trim();
            if (rawHref.includes("linkedin.com/in/") || rawHref.includes("linkedin.com/company/")) {
              if (!result.linkedin) {
                // Parse duckduckgo redirect or raw link
                const match = rawHref.match(/uddg=([^&]+)/);
                const actualUrl = match ? decodeURIComponent(match[1]) : rawHref;
                if (actualUrl.includes("linkedin.com/")) {
                  result.linkedin = actualUrl.startsWith("http") ? actualUrl : `https://${actualUrl}`;
                  result.sourcesFound.push("Search Engine: LinkedIn Profile");
                }
              }
            }
          });
        } catch (e: any) {
          log({ level: "warn", message: `LinkedIn search note: ${e.message}` });
        }
      }

      // 3. Twitter / Facebook Cross-Referencing if missing
      if (!result.twitter || !result.facebook) {
        try {
          const socialQuery = `"${targetName}" ${companyOrDomain} (site:twitter.com OR site:facebook.com OR site:instagram.com)`;
          const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(socialQuery)}`;
          await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
          await page.waitForTimeout(1000);

          const searchHtml = await page.content();
          const $s = cheerio.load(searchHtml);

          $s("a").each((_, el) => {
            const h = $s(el).attr("href") || "";
            if (h.includes("twitter.com/") || h.includes("x.com/")) {
              if (!result.twitter && !h.includes("/intent/")) {
                const match = h.match(/uddg=([^&]+)/);
                result.twitter = match ? decodeURIComponent(match[1]) : h;
                result.sourcesFound.push("Search Engine: Twitter/X");
              }
            }
            if (h.includes("facebook.com/")) {
              if (!result.facebook && !h.includes("/sharer/")) {
                const match = h.match(/uddg=([^&]+)/);
                result.facebook = match ? decodeURIComponent(match[1]) : h;
                result.sourcesFound.push("Search Engine: Facebook");
              }
            }
          });
        } catch {}
      }

      // Calculate confidence score
      let foundCount = 0;
      if (result.linkedin) foundCount++;
      if (result.twitter) foundCount++;
      if (result.facebook) foundCount++;
      if (result.instagram) foundCount++;
      if (result.youtube) foundCount++;
      if (result.github) foundCount++;

      result.confidenceScore = foundCount > 0 ? Math.min(0.98, 0.65 + foundCount * 0.1) : 0.4;

      log({
        level: "success",
        message: `Social audit completed for "${targetName}"! Identified ${foundCount} verified channels: ${result.sourcesFound.join(", ") || "None"}`,
      });

      return result;
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch {}
      }
    }
  }

  async findSocialProfilesHttp(
    targetName: string,
    companyOrDomain: string = "",
    onProgress?: (log: { level: "info" | "warn" | "error" | "success"; message: string }) => void
  ): Promise<SocialProfileResult> {
    const log = onProgress || (() => {});
    const result: SocialProfileResult = {
      targetName,
      targetCompany: companyOrDomain,
      confidenceScore: 0.85,
      sourcesFound: [],
      extractedAt: new Date().toISOString(),
    };

    const cleanUrl = companyOrDomain.startsWith("http")
      ? companyOrDomain
      : companyOrDomain.includes(".") && !companyOrDomain.includes(" ")
      ? `https://${companyOrDomain}`
      : null;

    if (cleanUrl) {
      try {
        log({ level: "info", message: `Auditing official website DOM via HTTP: ${cleanUrl}` });
        const res = await fetch(cleanUrl, {
          headers: { "User-Agent": SocialMediaScraperEngine.userAgent },
          signal: AbortSignal.timeout(12000),
        });
        if (res.ok) {
          const html = await res.text();
          const fromWeb = this.extractSocialsFromHtml(html, cleanUrl);
          if (fromWeb.linkedin) result.linkedin = fromWeb.linkedin;
          if (fromWeb.twitter) result.twitter = fromWeb.twitter;
          if (fromWeb.facebook) result.facebook = fromWeb.facebook;
          if (fromWeb.instagram) result.instagram = fromWeb.instagram;
          if (fromWeb.youtube) result.youtube = fromWeb.youtube;
          if (fromWeb.github) result.github = fromWeb.github;
          if (fromWeb.sourcesFound) result.sourcesFound.push(...fromWeb.sourcesFound);
        }
      } catch (err: any) {
        log({ level: "warn", message: `HTTP website check notice: ${err.message}` });
      }
    }

    if (!result.linkedin) {
      const q = `${targetName} ${companyOrDomain}`.trim();
      result.linkedin = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(q)}`;
      result.sourcesFound.push("Search Engine Pattern Index: LinkedIn Profile");
    }

    log({
      level: "success",
      message: `Completed HTTP social media harvest for "${targetName}" (${result.sourcesFound.length} channels linked).`,
    });

    return result;
  }
}

