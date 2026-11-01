import * as cheerio from "cheerio";
import { SocialProfiles } from "../../core/models/Company";

export class SocialMediaFinder {
  /**
   * Extract social profiles directly from the website HTML
   */
  extractFromHtml(html: string): SocialProfiles {
    const profiles: SocialProfiles = {};
    const $ = cheerio.load(html);

    $('a[href]').each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      const lower = href.toLowerCase();
      // LinkedIn
      if (lower.includes("linkedin.com/company/") || lower.includes("linkedin.com/school/")) {
        if (!profiles.linkedin) profiles.linkedin = href.split("?")[0];
      }
      // Twitter / X
      else if (lower.includes("twitter.com/") || lower.includes("x.com/")) {
        if (!lower.includes("/share") && !lower.includes("/intent") && !profiles.twitter) {
          profiles.twitter = href.split("?")[0];
        }
      }
      // Facebook
      else if (lower.includes("facebook.com/") && !lower.includes("/sharer")) {
        if (!profiles.facebook) profiles.facebook = href.split("?")[0];
      }
      // Instagram
      else if (lower.includes("instagram.com/")) {
        if (!profiles.instagram) profiles.instagram = href.split("?")[0];
      }
      // YouTube
      else if (lower.includes("youtube.com/@") || lower.includes("youtube.com/channel/") || lower.includes("youtube.com/c/")) {
        if (!profiles.youtube) profiles.youtube = href.split("?")[0];
      }
      // GitHub
      else if (lower.includes("github.com/")) {
        if (!profiles.github) profiles.github = href.split("?")[0];
      }
    });

    return profiles;
  }

  /**
   * Free discovery fallback via DuckDuckGo HTML Lite (no API key required)
   */
  async discoverViaSearch(companyName: string, domain: string): Promise<SocialProfiles> {
    const discovered: SocialProfiles = {};
    const query = `${companyName} ${domain} linkedin twitter facebook`;

    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const res = await fetch(searchUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) return discovered;
      const html = await res.text();
      const $ = cheerio.load(html);

      $(".result__url").each((_, el) => {
        const urlText = $(el).text().trim().toLowerCase();
        if (urlText.includes("linkedin.com/company/") && !discovered.linkedin) {
          discovered.linkedin = `https://${urlText}`;
        }
        if ((urlText.includes("twitter.com/") || urlText.includes("x.com/")) && !discovered.twitter) {
          discovered.twitter = `https://${urlText}`;
        }
        if (urlText.includes("facebook.com/") && !discovered.facebook) {
          discovered.facebook = `https://${urlText}`;
        }
      });
    } catch {
      // Graceful fallback if search engine blocks rate
    }

    return discovered;
  }
}

