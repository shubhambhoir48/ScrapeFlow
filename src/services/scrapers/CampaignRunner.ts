import { ScrapingCampaign } from "../../core/models/Campaign";
import { MongoCampaignRepository } from "../../repositories/MongoCampaignRepository";
import { PlaywrightScraperEngine } from "./PlaywrightScraperEngine";
import { GoogleMapsScraperEngine } from "./GoogleMapsScraperEngine";
import { GoogleSheetsService } from "../sheets/GoogleSheetsService";
import { MongoCompanyRepository } from "../../repositories/MongoCompanyRepository";
import { MongoPeopleRepository } from "../../repositories/MongoPeopleRepository";
import { BackgroundEnrichmentWorker } from "../enrichment/BackgroundEnrichmentWorker";
import { InMemoryJobQueue } from "../queue/InMemoryJobQueue";
import { SeniorityLevel } from "../../core/models/Person";

export class CampaignRunner {
  private repo = new MongoCampaignRepository();
  private playwright = new PlaywrightScraperEngine();
  private gmapsEngine = new GoogleMapsScraperEngine();
  private sheets = new GoogleSheetsService();
  private companyRepo = new MongoCompanyRepository();
  private peopleRepo = new MongoPeopleRepository();

  /**
   * Execute a campaign in the background with Multi-Level Deep Crawling & De-obfuscation
   */
  async runCampaign(campaignId: string): Promise<void> {
    const campaign = await this.repo.getById(campaignId);
    if (!campaign) return;

    await this.repo.update(campaignId, {
      status: "RUNNING",
      startedAt: new Date().toISOString(),
      progress: 5,
    });

    // Register in Job Queue monitor so it appears in /jobs
    const queue = InMemoryJobQueue.getInstance();
    const job = await queue.addJob(`Campaign: ${campaign.name}`, "BATCH_SCRAPE", {
      campaignId,
      type: campaign.type,
      targets: campaign.targetUrls,
    });
    await queue.updateJobStatus(job.id, "RUNNING", 10);

    try {
      if (campaign.type === "GOOGLE_MAPS") {
        await this.runGoogleMapsCampaign(campaign, job.id);
      } else {
        await this.runDirectoryCampaign(campaign, job.id);
      }
    } catch (err: any) {
      await this.repo.update(campaignId, {
        status: "FAILED",
      });
      await this.repo.addLog(campaignId, {
        level: "error",
        message: `Campaign execution failed: ${err.message}`,
      });
      await queue.updateJobStatus(job.id, "FAILED");
    }
  }

  /**
   * High-Volume Google Maps Scraping Pipeline
   */
  private async runGoogleMapsCampaign(campaign: ScrapingCampaign, jobId: string): Promise<void> {
    const campaignId = campaign.id!;
    const queue = InMemoryJobQueue.getInstance();

    await this.repo.addLog(campaignId, {
      level: "info",
      message: `Starting Google Maps Campaign: "${campaign.name}" for "${campaign.mapsQuery || campaign.name}" in ${campaign.mapsCity || ""}, ${campaign.mapsState || ""}, ${campaign.mapsCountry || "India"}`,
    });

    const targetLimit = campaign.mapsLimit || 50;

    const places = await this.gmapsEngine.searchAndScrape({
      query: campaign.mapsQuery || campaign.name,
      category: campaign.mapsCategory,
      country: campaign.mapsCountry,
      state: campaign.mapsState,
      city: campaign.mapsCity,
      minRating: campaign.mapsMinRating,
      minReviews: campaign.mapsMinReviews,
      mustHavePhone: campaign.mapsHasPhone,
      mustHaveWebsite: campaign.mapsHasWebsite,
      limit: targetLimit,
      onProgress: async (log) => {
        await this.repo.addLog(campaignId, log);
      },
    });

    await this.repo.addLog(campaignId, {
      level: "info",
      message: `Extracted ${places.length} business places from Google Maps. Persisting to Central Database (MongoDB Atlas)...`,
    });

    const structuredRecords: Record<string, any>[] = [];

    for (let i = 0; i < places.length; i++) {
      const p = places[i];
      const cleanDomain = p.website ? p.website.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0] : "";

      // Save Company into MongoDB Atlas
      const savedCompany = await this.companyRepo.create({
        companyName: p.name,
        domain: cleanDomain || p.mapsUrl,
        websiteUrl: p.website || p.mapsUrl,
        industry: p.category,
        phones: p.phone ? [{ number: p.phone, source: "google_maps", verified: true }] : [],
        emails: [],
        addresses: [{ fullAddress: p.address, city: p.city, state: p.state, country: p.country }],
        googleMaps: {
          title: p.name,
          mapsUrl: p.mapsUrl,
          rating: p.rating,
          reviewCount: p.reviewCount,
        },
        socialProfiles: {},
        verificationStatus: "VERIFIED",
        enrichmentStatus: p.website ? "PENDING" : "ENRICHED",
        confidenceScore: 0.98,
        scrapedAt: new Date().toISOString(),
      });

      structuredRecords.push({
        id: p.id,
        name: p.name,
        companyName: p.name,
        category: p.category,
        rating: p.rating ? `${p.rating} ★` : "-",
        reviews: p.reviewCount || 0,
        phone: p.phone || "-",
        address: p.address,
        website: p.website || "-",
        mapsUrl: p.mapsUrl,
        scrapedAt: p.scrapedAt,
      });

      // Stream to Google Sheet if enabled
      if (campaign.liveSyncToSheet && campaign.spreadsheetId) {
        try {
          await this.sheets.appendRow(campaign.spreadsheetId, campaign.sheetName || "Sheet1", [
            p.name,
            p.category,
            p.rating?.toString() || "",
            p.reviewCount?.toString() || "",
            p.phone || "",
            "", // email to be populated via cascade enrich
            p.address,
            p.website || "",
            p.mapsUrl,
            new Date().toISOString(),
          ]);
        } catch {}
      }

      // If website is present, trigger corporate website spider for verified corporate emails
      if (p.website && savedCompany._id) {
        BackgroundEnrichmentWorker.getInstance()
          .enrichCompanyById(savedCompany._id)
          .catch(() => {});
      }

      // Instantly flush each place to campaign's extractedRecords in real time!
      await this.repo.addExtractedRecords(campaignId, [structuredRecords[structuredRecords.length - 1]]);

      // Periodic progress updates
      if ((i + 1) % 2 === 0 || i === places.length - 1) {
        const prog = Math.round(((i + 1) / places.length) * 100);
        await this.repo.update(campaignId, { progress: prog, processedItems: i + 1, successCount: i + 1 });
        await queue.updateJobStatus(jobId, "RUNNING", prog);
      }
    }

    await this.repo.update(campaignId, {
      status: "COMPLETED",
      progress: 100,
      completedAt: new Date().toISOString(),
      successCount: structuredRecords.length,
      totalItems: structuredRecords.length,
    });

    await this.repo.addLog(campaignId, {
      level: "success",
      message: `Google Maps Campaign completed! Harvested ${structuredRecords.length} business records with live ratings, phone numbers, and addresses.`,
    });
    await queue.updateJobStatus(jobId, "COMPLETED", 100);
  }

  /**
   * Enterprise Multi-Level Directory Crawling Pipeline
   */
  private async runDirectoryCampaign(campaign: ScrapingCampaign, jobId: string): Promise<void> {
    const campaignId = campaign.id!;
    const queue = InMemoryJobQueue.getInstance();

    await this.repo.addLog(campaignId, {
      level: "info",
      message: `Starting directory campaign "${campaign.name}" with engine: ${campaign.engine} (Depth: ${campaign.crawlDepth || "LEVEL_2_LISTINGS"}, Pages: ${campaign.paginationLimit || 5})`,
    });

    const totalUrls = campaign.targetUrls.length;
    let totalExtracted = campaign.extractedRecords?.length || campaign.successCount || 0;
    const isUnlimited = campaign.isUnlimited || campaign.targetQuota === 0;
    const quotaPerUrl = isUnlimited
      ? 9999999
      : (campaign.targetQuota || campaign.mapsLimit || (campaign.paginationLimit ? Math.max(60, campaign.paginationLimit * 30) : 100));

    // Check for resumable checkpoint
    const checkpoint = campaign.checkpoint;
    const resumeIndex = checkpoint?.lastPathwayIndex !== undefined ? checkpoint.lastPathwayIndex + 1 : 0;
    const existingFrontier = checkpoint?.listingUrlsToCrawl;

    for (let i = 0; i < totalUrls; i++) {
      const url = campaign.targetUrls[i].trim();
      if (!url) continue;

      await this.repo.addLog(campaignId, {
        level: "info",
        message: `[${i + 1}/${totalUrls}] Navigating to seed directory: ${url} (${isUnlimited ? "UNLIMITED FULL DIRECTORY MODE" : `Target Quota: ${quotaPerUrl}`})${resumeIndex > 0 ? ` [Resuming from pathway ${resumeIndex + 1}]` : ""}`,
      });

      // 1. Scrape using Playwright Stealth Deep Crawler with LIVE STREAMING PERSISTENCE
      await this.playwright.deepCrawl(url, {
        crawlDepth: campaign.crawlDepth || "LEVEL_2_LISTINGS",
        maxPages: campaign.paginationLimit || (isUnlimited ? 100 : 10),
        maxItems: quotaPerUrl,
        maxCategories: isUnlimited ? 5000 : Math.max(100, Math.ceil(quotaPerUrl / 10)),
        resumeFromPathwayIndex: resumeIndex,
        existingFrontier: existingFrontier,
        onProgress: async (log) => {
          await this.repo.addLog(campaignId, log);
        },
        // INSTANT STREAMING FLUSH: Persist each page/pathway batch directly to MongoDB Atlas!
        onBatchExtracted: async (batch, pathwayInfo) => {
          if (!batch || batch.length === 0) return;

          // 1. Instantly append to campaign's extractedRecords in MongoDB Atlas
          await this.repo.addExtractedRecords(campaignId, batch);

          // 2. Instantly upsert into Central Database (Companies & People collections)
          for (const rec of batch) {
            const cleanDomain = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];
            const compName = rec.companyName || rec.name || cleanDomain;

            try {
              const existingComp = await this.companyRepo.findOne({ companyName: compName });
              let companyId: string | undefined = existingComp?._id;

              if (!existingComp) {
                const createdComp = await this.companyRepo.create({
                  domain: cleanDomain,
                  companyName: compName,
                  websiteUrl: rec.link || rec.companyInfoUrl || url,
                  contactPerson: rec.contactPerson,
                  designation: rec.designation,
                  products: rec.products,
                  phones: rec.phone && !rec.phone.includes("Protected")
                    ? [{ number: rec.phone, source: "website", verified: true }]
                    : [],
                  emails: rec.email
                    ? [{ address: rec.email, type: "corporate", mxVerified: true, confidenceScore: 0.9 }]
                    : [],
                  addresses: rec.fullAddress || rec.address
                    ? [{ fullAddress: rec.fullAddress || rec.address, city: rec.city }]
                    : [],
                  socialProfiles: {},
                  verificationStatus: "VERIFIED",
                  enrichmentStatus: "PENDING",
                  confidenceScore: 0.95,
                  scrapedAt: new Date().toISOString(),
                });
                companyId = createdComp._id;
              }

              // Decision Maker record
              if (rec.contactPerson && rec.contactPerson !== "Key Decision Maker") {
                const existingPerson = await this.peopleRepo.findOne({
                  fullName: rec.contactPerson,
                  organizationName: compName,
                });
                if (!existingPerson) {
                  await this.peopleRepo.create({
                    fullName: rec.contactPerson,
                    designation: rec.designation || "Executive",
                    seniority: this.parseSeniority(rec.designation),
                    department: "EXECUTIVE",
                    organizationName: compName,
                    organizationDomain: cleanDomain,
                    workEmail: rec.email || undefined,
                    workEmailVerified: !!rec.email,
                    phone: rec.phone && !rec.phone.includes("Protected") ? rec.phone : undefined,
                    mobilePhone: rec.phone && !rec.phone.includes("Protected") ? rec.phone : undefined,
                    whatsappAvailable: Boolean(rec.phone && !rec.phone.includes("Protected")),
                    verificationStatus: "VERIFIED",
                    confidenceScore: 0.9,
                    scrapedAt: new Date().toISOString(),
                    source: "schema_org",
                  });
                }
              }

              // Autonomous cascade enrichment trigger
              if (companyId && (!rec.phone || rec.phone.includes("Protected") || !rec.email)) {
                BackgroundEnrichmentWorker.getInstance()
                  .enrichCompanyById(companyId)
                  .catch(() => {});
              }

              // Google Sheets Live Streaming if enabled
              if (campaign.liveSyncToSheet && campaign.spreadsheetId) {
                try {
                  await this.sheets.appendRow(campaign.spreadsheetId, campaign.sheetName || "Sheet1", [
                    compName,
                    rec.contactPerson || "",
                    rec.designation || "",
                    rec.phone || "",
                    rec.email || "",
                    rec.fullAddress || rec.address || "",
                    rec.city || "",
                    rec.products || "",
                    rec.link || url,
                    new Date().toISOString(),
                  ]);
                } catch {}
              }
            } catch (err: any) {
              console.warn(`Record persistence warning for ${compName}:`, err.message);
            }
          }

          // 3. Increment counters & update live progress in DB
          totalExtracted += batch.length;
          const pct = isUnlimited
            ? Math.min(99, Math.round(((pathwayInfo.index + 1) / pathwayInfo.total) * 100))
            : Math.min(100, Math.round((totalExtracted / quotaPerUrl) * 100));

          await this.repo.update(campaignId, {
            progress: pct,
            processedItems: totalExtracted,
            successCount: totalExtracted,
            totalItems: Math.max(totalExtracted, campaign.targetQuota || totalExtracted),
          });
          await queue.updateJobStatus(jobId, "RUNNING", pct);
        },
        // LIVE CHECKPOINT: Save state so campaign can be resumed at any time
        onCheckpoint: async (cp) => {
          await this.repo.update(campaignId, {
            checkpoint: {
              lastPathwayIndex: cp.lastPathwayIndex,
              totalPathways: cp.totalPathways,
              lastListingUrl: cp.lastListingUrl,
              listingUrlsToCrawl: cp.listingUrlsToCrawl,
              lastUpdated: new Date().toISOString(),
            },
          });
        },
      });

      const progress = Math.round(((i + 1) / totalUrls) * 100);
      await this.repo.update(campaignId, {
        progress,
        processedItems: totalExtracted,
        successCount: totalExtracted,
      });
      await queue.updateJobStatus(jobId, "RUNNING", progress);
    }

    await this.repo.update(campaignId, {
      status: "COMPLETED",
      progress: 100,
      completedAt: new Date().toISOString(),
    });
    await this.repo.addLog(campaignId, {
      level: "success",
      message: `Directory campaign completed! Total records extracted: ${totalExtracted}. Auto-enrichment active in background.`,
    });
    await queue.updateJobStatus(jobId, "COMPLETED", 100);
  }

  private parseSeniority(designation?: string): SeniorityLevel {
    if (!designation) return "GENERAL";
    const d = designation.toUpperCase();
    if (d.includes("FOUNDER") || d.includes("CO-FOUNDER")) return "FOUNDER";
    if (d.includes("PROPRIETOR") || d.includes("OWNER")) return "FOUNDER";
    if (d.includes("DIRECTOR") || d.includes("MANAGING DIRECTOR")) return "DIRECTOR";
    if (d.includes("CEO") || d.includes("CHIEF")) return "C_SUITE";
    if (d.includes("VP") || d.includes("VICE PRESIDENT")) return "VP";
    if (d.includes("MANAGER")) return "MANAGER";
    return "GENERAL";
  }
}
