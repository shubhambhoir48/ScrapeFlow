import { NextResponse } from "next/server";
import { MongoCampaignRepository } from "@/repositories/MongoCampaignRepository";
import { PlaywrightScraperEngine } from "@/services/scrapers/PlaywrightScraperEngine";
import { MongoCompanyRepository } from "@/repositories/MongoCompanyRepository";
import { MongoPeopleRepository } from "@/repositories/MongoPeopleRepository";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const repo = new MongoCampaignRepository();
    const campaign = await repo.getById(params.id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status === "PAUSED" || campaign.status === "COMPLETED") {
      return NextResponse.json({ campaign, isDone: campaign.status === "COMPLETED" });
    }

    const companyRepo = new MongoCompanyRepository();
    const peopleRepo = new MongoPeopleRepository();
    const playwright = new PlaywrightScraperEngine();

    const url = campaign.targetUrls[0] || "https://www.maharashtradirectory.com/";
    const isUnlimited = campaign.isUnlimited;
    const targetQuota = isUnlimited ? 999999 : (campaign.targetQuota || 100);
    const checkpoint = campaign.checkpoint;
    const resumeIndex = checkpoint?.lastPathwayIndex !== undefined ? checkpoint.lastPathwayIndex + 1 : 0;
    const existingFrontier = checkpoint?.listingUrlsToCrawl;

    const newlyExtracted: Record<string, any>[] = [];

    const crawlRes = await playwright.deepCrawl(url, {
      crawlDepth: campaign.crawlDepth || "LEVEL_2_LISTINGS",
      maxPages: 2,
      maxItems: Math.min(20, Math.max(5, targetQuota - (campaign.successCount || 0))),
      maxCategories: 2,
      resumeFromPathwayIndex: resumeIndex,
      existingFrontier,
      onProgress: async (log) => {
        await repo.addLog(params.id, log);
      },
      onBatchExtracted: async (batch) => {
        for (const item of batch) {
          newlyExtracted.push(item);
        }
      },
      onCheckpoint: async (cp) => {
        await repo.update(params.id, {
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

    if (newlyExtracted.length > 0) {
      await repo.addExtractedRecords(params.id, newlyExtracted);

      // Central Intelligence persistence
      const cleanDomain = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];
      for (const rec of newlyExtracted) {
        const compName = rec.companyName || rec.name || cleanDomain;
        try {
          await companyRepo.create({
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

          if (rec.contactPerson && rec.contactPerson !== "Key Decision Maker") {
            await peopleRepo.create({
              fullName: rec.contactPerson,
              designation: rec.designation || "Executive",
              seniority: "GENERAL",
              department: "EXECUTIVE",
              organizationName: compName,
              organizationDomain: cleanDomain,
              workEmail: rec.email || undefined,
              workEmailVerified: !!rec.email,
              mobilePhone: rec.phone && !rec.phone.includes("Protected") ? rec.phone : undefined,
              whatsappAvailable: false,
              location: { city: rec.city, raw: rec.address || rec.fullAddress },
              verificationStatus: "VERIFIED",
              enrichmentStatus: "PENDING",
              confidenceScore: 0.9,
              scrapedAt: new Date().toISOString(),
              source: "schema_org",
            });
          }
        } catch {}
      }
    }

    const currentTotal = (campaign.successCount || 0) + newlyExtracted.length;
    const isDone = (!isUnlimited && currentTotal >= targetQuota) || (crawlRes.items.length === 0 && newlyExtracted.length === 0);

    const finalStatus = isDone ? "COMPLETED" : "RUNNING";
    const finalProgress = isDone ? 100 : Math.min(95, Math.round((currentTotal / targetQuota) * 100) || 15);

    const updated = await repo.update(params.id, {
      status: finalStatus,
      progress: finalProgress,
      successCount: currentTotal,
      processedItems: currentTotal,
      completedAt: isDone ? new Date().toISOString() : undefined,
    });

    return NextResponse.json({
      success: true,
      campaign: updated || campaign,
      newlyExtractedCount: newlyExtracted.length,
      isDone,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

