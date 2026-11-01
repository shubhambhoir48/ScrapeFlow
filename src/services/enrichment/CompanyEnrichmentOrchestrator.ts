import { IEnrichmentService, EnrichmentOptions } from "../../core/interfaces/IEnrichmentService";
import { Company, EmailRecord, PhoneRecord } from "../../core/models/Company";
import { Person } from "../../core/models/Person";
import { WebsiteContentScraper } from "../scrapers/WebsiteContentScraper";
import { GoogleMapsScraper } from "../scrapers/GoogleMapsScraper";
import { SocialMediaFinder } from "../scrapers/SocialMediaFinder";
import { EmailVerifier } from "../scrapers/EmailVerifier";
import { PeopleFinderScraper } from "../scrapers/PeopleFinderScraper";
import { MongoCompanyRepository } from "../../repositories/MongoCompanyRepository";
import { MongoPeopleRepository } from "../../repositories/MongoPeopleRepository";
import { GoogleSheetsService } from "../sheets/GoogleSheetsService";

export interface ExtendedEnrichmentOptions extends EnrichmentOptions {
  audienceType?: string;
  entityType?: "PEOPLE" | "ORGANIZATION" | "BOTH";
  selectedSeniorities?: string[];
  selectedDepartments?: string[];
  customKeywords?: string[];
  depth?: "QUICK" | "DEEP" | "EXTENSIVE";
}

export class CompanyEnrichmentOrchestrator implements IEnrichmentService {
  private websiteScraper = new WebsiteContentScraper();
  private mapsScraper = new GoogleMapsScraper();
  private socialFinder = new SocialMediaFinder();
  private emailVerifier = new EmailVerifier();
  private peopleFinder = new PeopleFinderScraper();
  private companyRepo = new MongoCompanyRepository();
  private peopleRepo = new MongoPeopleRepository();
  private sheetsService = new GoogleSheetsService();

  async enrichCompany(target: string, options: ExtendedEnrichmentOptions = {}): Promise<Company> {
    const rawTarget = target.trim();
    const isUrl = rawTarget.startsWith("http://") || rawTarget.startsWith("https://") || rawTarget.includes(".");
    const domain = isUrl
      ? rawTarget.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0]
      : `${rawTarget.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
    const targetUrl = isUrl ? (rawTarget.startsWith("http") ? rawTarget : `https://${rawTarget}`) : `https://${domain}`;

    // 1. Crawl Company Website
    const webData = await this.websiteScraper.scrape(targetUrl);
    const searchQuery = webData.companyName || rawTarget;

    // 2. Extract Google Maps Profile
    const mapsData = await this.mapsScraper.scrape(searchQuery);

    // 3. Locate Social Media Handles
    let socials = webData.websiteUrl ? this.socialFinder.extractFromHtml(webData.description || "") : {};
    if (!socials.linkedin || !socials.twitter) {
      const discovered = await this.socialFinder.discoverViaSearch(searchQuery, domain);
      socials = { ...socials, ...discovered };
    }

    // 4. Verify Corporate Emails (MX & Domain checks)
    const verifiedEmails: EmailRecord[] = [];
    if (webData.emails && webData.emails.length > 0) {
      for (const email of webData.emails.slice(0, 3)) {
        const v = await this.emailVerifier.verifyEmail(email.address);
        verifiedEmails.push(v);
      }
    } else {
      const synthetic = `contact@${domain}`;
      const v = await this.emailVerifier.verifyEmail(synthetic);
      if (v.mxVerified) {
        verifiedEmails.push(v);
      }
    }

    // 5. Consolidate Phones
    const phones: PhoneRecord[] = [...(webData.phones || [])];

    // 6. Cross-verification & Confidence Scoring
    let confidenceScore = 0.5;
    if (webData.companyName) confidenceScore += 0.15;
    if (verifiedEmails.some((e) => e.mxVerified)) confidenceScore += 0.2;
    if (socials.linkedin) confidenceScore += 0.1;
    if (mapsData.googleMaps?.rating) confidenceScore += 0.05;

    const verificationStatus: Company["verificationStatus"] =
      confidenceScore >= 0.8 ? "VERIFIED" : confidenceScore >= 0.6 ? "PARTIAL" : "UNVERIFIED";

    const company: Company = {
      domain,
      companyName: webData.companyName || searchQuery,
      tagline: webData.tagline,
      description: webData.description,
      industry: webData.techStack?.length ? "Technology & Software" : "Business Services",
      websiteUrl: targetUrl,
      emails: verifiedEmails,
      phones,
      addresses: webData.addresses || [],
      socialProfiles: socials,
      googleMaps: mapsData.googleMaps,
      techStack: webData.techStack,
      verificationStatus,
      confidenceScore: Math.min(1.0, confidenceScore),
      scrapedAt: new Date().toISOString(),
    };

    // 7. Persist Organization to MongoDB
    const savedCompany = await this.companyRepo.upsert({ domain }, company);

    // 8. Extract People / Decision Makers if requested
    const entityType = options.entityType || "BOTH";
    if (entityType === "PEOPLE" || entityType === "BOTH") {
      try {
        const people = await this.peopleFinder.findPeople(savedCompany.companyName, domain, {
          targetSeniorities: options.selectedSeniorities,
          targetDepartments: options.selectedDepartments,
          customKeywords: options.customKeywords,
          depth: options.depth || "DEEP",
        });

        for (const p of people) {
          await this.peopleRepo.upsert({ fullName: p.fullName, organizationDomain: domain }, p);

          // Stream person to Google Sheet if enabled
          if (options.liveSyncToSheet && options.spreadsheetId) {
            try {
              const personRow = [
                p.fullName,
                p.designation,
                p.seniority,
                p.organizationName,
                p.workEmail || "",
                p.phone || "",
                p.whatsapp || "",
                p.linkedinUrl || "",
                p.verificationStatus,
              ];
              await this.sheetsService.appendRow(options.spreadsheetId, options.sheetName || "Sheet1", personRow);
            } catch (err) {
              console.error("Failed to append person to sheet:", err);
            }
          }
        }
      } catch (peopleErr) {
        console.error("People discovery error:", peopleErr);
      }
    }

    // 9. Live Stream Company row to Google Sheet
    if (options.liveSyncToSheet && options.spreadsheetId && entityType !== "PEOPLE") {
      try {
        const rowData = [
          company.domain,
          company.companyName,
          company.phones[0]?.number || "",
          company.emails[0]?.address || "",
          company.socialProfiles.linkedin || "",
          company.socialProfiles.twitter || "",
          company.googleMaps?.rating?.toString() || "",
          company.verificationStatus,
          company.scrapedAt,
        ];
        await this.sheetsService.appendRow(options.spreadsheetId, options.sheetName || "Sheet1", rowData);
      } catch (sheetErr) {
        console.error("Failed to live stream row to Google Sheet:", sheetErr);
      }
    }

    return savedCompany;
  }

  async enrichBatch(
    targets: string[],
    options: ExtendedEnrichmentOptions = {},
    onProgress?: (p: number, current: Company) => void
  ): Promise<Company[]> {
    const results: Company[] = [];
    const total = targets.length;

    for (let i = 0; i < total; i++) {
      const enriched = await this.enrichCompany(targets[i], options);
      results.push(enriched);
      if (onProgress) {
        const progress = Math.round(((i + 1) / total) * 100);
        onProgress(progress, enriched);
      }
    }

    return results;
  }
}
