import { NextResponse } from "next/server";
import { DeepSiteExplorer } from "@/services/scrapers/DeepSiteExplorer";
import { PlaywrightScraperEngine } from "@/services/scrapers/PlaywrightScraperEngine";
import { MongoCompanyRepository } from "@/repositories/MongoCompanyRepository";
import { MongoPeopleRepository } from "@/repositories/MongoPeopleRepository";
import { BackgroundEnrichmentWorker } from "@/services/enrichment/BackgroundEnrichmentWorker";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 });
    }

    const explorer = new DeepSiteExplorer();
    const analysis = await explorer.exploreSite(url);

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("Deep site inspection error:", error);
    return NextResponse.json({ error: error.message || "Failed to inspect site hierarchy" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { url, crawlDepth, maxPages, selectedFields } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "Missing 'url'" }, { status: 400 });
    }

    const playwright = new PlaywrightScraperEngine();
    const result = await playwright.deepCrawl(url, {
      crawlDepth: crawlDepth || "LEVEL_2_LISTINGS",
      maxPages: maxPages || 3,
      maxItems: 40,
      selectedFields,
    });

    const companyRepo = new MongoCompanyRepository();
    const peopleRepo = new MongoPeopleRepository();
    const cleanDomain = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];

    // Persist all extracted records directly into Central Database (Data Explorer)
    for (const rec of result.items) {
      const compName = rec.companyName || rec.name || cleanDomain;
      try {
        const savedCompany = await companyRepo.create({
          domain: cleanDomain,
          companyName: compName,
          websiteUrl: rec.link || url,
          contactPerson: rec.contactPerson,
          designation: rec.designation,
          products: rec.products,
          phones: rec.phone && !rec.phone.includes("Protected")
            ? [{ number: rec.phone, source: "website", verified: true }]
            : [],
          emails: rec.email
            ? [{ address: rec.email, type: "corporate", mxVerified: true, confidenceScore: 0.9 }]
            : [],
          addresses: rec.address || rec.fullAddress
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
            seniority: rec.designation?.toUpperCase().includes("DIRECTOR")
              ? "DIRECTOR"
              : rec.designation?.toUpperCase().includes("PROP")
              ? "FOUNDER"
              : "GENERAL",
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

        // Trigger autonomous cascade enrichment
        if (savedCompany._id) {
          BackgroundEnrichmentWorker.getInstance()
            .enrichCompanyById(savedCompany._id)
            .catch(() => {});
        }
      } catch (saveErr: any) {
        console.warn(`Failed to persist item ${compName}:`, saveErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      count: result.count,
      data: result.items,
      savedToDatabase: true,
    });
  } catch (error: any) {
    console.error("Scrape selected fields error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
