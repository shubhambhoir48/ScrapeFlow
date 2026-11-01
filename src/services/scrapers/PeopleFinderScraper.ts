import * as cheerio from "cheerio";
import { Person, SeniorityLevel, Department } from "../../core/models/Person";
import { EmailVerifier } from "./EmailVerifier";

export class PeopleFinderScraper {
  private emailVerifier = new EmailVerifier();

  /**
   * Scrapes people/decision makers from a target company by crawling team pages
   * and executing search engine discovery.
   */
  async findPeople(
    companyName: string,
    domain: string,
    options: {
      targetSeniorities?: string[];
      targetDepartments?: string[];
      customKeywords?: string[];
      depth?: "QUICK" | "DEEP" | "EXTENSIVE";
    } = {}
  ): Promise<Person[]> {
    const people: Person[] = [];
    const seenNames = new Set<string>();

    // 1. Try Crawling Company Website Team Pages
    const teamPagePeople = await this.scrapeTeamPages(domain, companyName);
    for (const p of teamPagePeople) {
      if (!seenNames.has(p.fullName.toLowerCase())) {
        seenNames.add(p.fullName.toLowerCase());
        people.push(p);
      }
    }

    // 2. Discover via Public LinkedIn / Search Dorks (Free Search Engine)
    if (options.depth !== "QUICK" || people.length === 0) {
      const searchPeople = await this.discoverViaSearchDorks(companyName, domain, options.customKeywords);
      for (const p of searchPeople) {
        if (!seenNames.has(p.fullName.toLowerCase())) {
          seenNames.add(p.fullName.toLowerCase());
          people.push(p);
        }
      }
    }

    // 3. Filter by Selected Seniority & Department if specified
    let filtered = people;
    if (options.targetSeniorities && options.targetSeniorities.length > 0) {
      filtered = filtered.filter((p) =>
        options.targetSeniorities!.includes(p.seniority) || options.targetSeniorities!.includes("ALL")
      );
    }
    if (options.targetDepartments && options.targetDepartments.length > 0) {
      filtered = filtered.filter((p) =>
        options.targetDepartments!.includes(p.department) || options.targetDepartments!.includes("ALL")
      );
    }

    // 4. Enrich corporate emails and verify MX records
    for (const person of filtered) {
      if (!person.workEmail && person.firstName && person.lastName) {
        const guessed = `${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}@${domain}`;
        const v = await this.emailVerifier.verifyEmail(guessed);
        person.workEmail = guessed;
        person.workEmailVerified = v.mxVerified;
      }
    }

    return filtered;
  }

  /**
   * Crawls known team/leadership endpoints on the company website
   */
  private async scrapeTeamPages(domain: string, companyName: string): Promise<Person[]> {
    const results: Person[] = [];
    const paths = ["/about", "/team", "/leadership", "/about-us", "/our-team", "/people"];

    for (const path of paths) {
      try {
        const url = `https://${domain}${path}`;
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(6000),
        });

        if (!res.ok) continue;
        const html = await res.text();
        const $ = cheerio.load(html);

        // Scan for team cards
        const memberSelectors = [
          ".team-member",
          ".member",
          ".leader",
          ".card",
          '[class*="team"]',
          '[class*="member"]',
          '[class*="person"]',
          '[class*="leader"]',
        ];

        for (const selector of memberSelectors) {
          const cards = $(selector);
          if (cards.length >= 2 && cards.length <= 40) {
            cards.each((_, el) => {
              const card = $(el);
              const name = card.find("h2, h3, h4, strong, .name").first().text().trim();
              const designation = card.find("p, .role, .title, .designation, span").first().text().trim();
              const linkedin = card.find('a[href*="linkedin.com/in/"]').first().attr("href");
              const email = card.find('a[href^="mailto:"]').first().attr("href")?.replace(/^mailto:/i, "");

              if (name && name.length >= 3 && name.length <= 40 && designation && designation.length >= 3) {
                const parts = name.split(" ");
                const seniority = this.classifySeniority(designation);
                const department = this.classifyDepartment(designation);

                results.push({
                  fullName: name,
                  firstName: parts[0],
                  lastName: parts.slice(1).join(" ") || "",
                  designation,
                  seniority,
                  department,
                  organizationName: companyName,
                  organizationDomain: domain,
                  workEmail: email,
                  workEmailVerified: Boolean(email),
                  whatsappAvailable: false,
                  linkedinUrl: linkedin,
                  verificationStatus: email || linkedin ? "VERIFIED" : "PARTIAL",
                  confidenceScore: email ? 0.95 : 0.8,
                  scrapedAt: new Date().toISOString(),
                  source: "team_page",
                });
              }
            });

            if (results.length > 0) return results.slice(0, 15);
          }
        }
      } catch {
        // Skip failed path
      }
    }

    return results;
  }

  /**
   * Executes search engine discovery for company decision makers
   */
  private async discoverViaSearchDorks(
    companyName: string,
    domain: string,
    customKeywords?: string[]
  ): Promise<Person[]> {
    const results: Person[] = [];
    const rolesQuery = customKeywords?.length
      ? customKeywords.join(" OR ")
      : "Founder OR CEO OR CTO OR Director OR 'Head of' OR VP";

    const query = `site:linkedin.com/in/ "${companyName}" (${rolesQuery})`;

    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const res = await fetch(searchUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(7000),
      });

      if (!res.ok) return results;
      const html = await res.text();
      const $ = cheerio.load(html);

      $(".result").each((_, el) => {
        const titleText = $(el).find(".result__title").text().trim();
        const snippetText = $(el).find(".result__snippet").text().trim();
        const link = $(el).find(".result__url").text().trim();

        // Pattern: "John Doe - Founder & CEO at Acme | LinkedIn"
        const cleanTitle = titleText.replace(/\s*\|\s*LinkedIn$/i, "").trim();
        if (cleanTitle.includes("-") || cleanTitle.includes("–") || cleanTitle.includes("|")) {
          const split = cleanTitle.split(/[-–|]/);
          const name = split[0].trim();
          const designation = split.slice(1).join(" - ").trim();

          if (name.length >= 3 && name.length <= 40 && designation.length >= 3) {
            const parts = name.split(" ");
            const seniority = this.classifySeniority(designation);
            const department = this.classifyDepartment(designation);

            results.push({
              fullName: name,
              firstName: parts[0],
              lastName: parts.slice(1).join(" ") || "",
              designation,
              seniority,
              department,
              organizationName: companyName,
              organizationDomain: domain,
              workEmailVerified: false,
              linkedinUrl: link.startsWith("http") ? link : `https://${link}`,
              whatsappAvailable: false,
              verificationStatus: "VERIFIED",
              confidenceScore: 0.88,
              experienceSummary: snippetText.slice(0, 160),
              scrapedAt: new Date().toISOString(),
              source: "search_engine",
            });
          }
        }
      });
    } catch {
      // Graceful fallback
    }

    return results.slice(0, 12);
  }

  private classifySeniority(title: string): SeniorityLevel {
    const t = title.toLowerCase();
    if (t.includes("founder") || t.includes("co-founder")) return "FOUNDER";
    if (t.includes("ceo") || t.includes("cto") || t.includes("cfo") || t.includes("cmo") || t.includes("coo") || t.includes("chief")) return "C_SUITE";
    if (t.includes("chairman") || t.includes("chairperson")) return "CHAIRMAN";
    if (t.includes("board")) return "BOARD_MEMBER";
    if (t.includes("advisor") || t.includes("advisory")) return "ADVISOR";
    if (t.includes("vp") || t.includes("vice president")) return "VP";
    if (t.includes("director") || t.includes("managing director")) return "DIRECTOR";
    if (t.includes("head of") || t.includes("lead")) return "HEAD_OF_DEPT";
    if (t.includes("marketing") || t.includes("growth")) return "MARKETING";
    if (t.includes("sales") || t.includes("account exec") || t.includes("bdr") || t.includes("sdr")) return "SALES";
    if (t.includes("support") || t.includes("customer success") || t.includes("service")) return "CUSTOMER_SUPPORT";
    if (t.includes("manager")) return "MANAGER";
    return "GENERAL";
  }

  private classifyDepartment(title: string): Department {
    const t = title.toLowerCase();
    if (t.includes("founder") || t.includes("ceo") || t.includes("director") || t.includes("president") || t.includes("chief executive")) return "EXECUTIVE";
    if (t.includes("engineer") || t.includes("tech") || t.includes("developer") || t.includes("cto") || t.includes("architect")) return "ENGINEERING";
    if (t.includes("product") || t.includes("cpo") || t.includes("designer") || t.includes("ux")) return "PRODUCT";
    if (t.includes("sales") || t.includes("revenue") || t.includes("cro") || t.includes("business dev")) return "SALES";
    if (t.includes("market") || t.includes("growth") || t.includes("cmo") || t.includes("content") || t.includes("seo")) return "MARKETING";
    if (t.includes("finance") || t.includes("cfo") || t.includes("accountant") || t.includes("invest")) return "FINANCE";
    if (t.includes("operations") || t.includes("coo") || t.includes("supply")) return "OPERATIONS";
    if (t.includes("hr") || t.includes("people") || t.includes("talent") || t.includes("recruit")) return "HUMAN_RESOURCES";
    if (t.includes("legal") || t.includes("counsel") || t.includes("compliance")) return "LEGAL";
    if (t.includes("support") || t.includes("success") || t.includes("service")) return "CUSTOMER_SUCCESS";
    return "GENERAL";
  }
}
