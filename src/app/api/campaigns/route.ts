import { NextResponse } from "next/server";
import { MongoCampaignRepository } from "@/repositories/MongoCampaignRepository";
import { CampaignRunner } from "@/services/scrapers/CampaignRunner";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const repo = new MongoCampaignRepository();
    const campaigns = await repo.getAll();
    return NextResponse.json({ campaigns });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      type,
      targetUrls,
      fields,
      engine,
      stealthMode,
      concurrency,
      crawlDepth,
      paginationLimit,
      targetQuota,
      isUnlimited,
      selectedFieldKeys,
      liveSyncToSheet,
      spreadsheetId,
      sheetName,
      // Google Maps Parameters
      mapsQuery,
      mapsCountry,
      mapsState,
      mapsCity,
      mapsCategory,
      mapsMinRating,
      mapsMinReviews,
      mapsHasPhone,
      mapsHasWebsite,
      mapsLimit,
    } = body;

    const urls = targetUrls && targetUrls.length > 0 ? targetUrls : ["https://maps.google.com"];

    if (!name) {
      return NextResponse.json({ error: "Missing campaign name" }, { status: 400 });
    }

    const repo = new MongoCampaignRepository();
    const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const campaign = await repo.create({
      id: campaignId,
      name,
      description,
      type: type || "DIRECTORY_SCRAPER",
      status: "QUEUED",
      targetUrls: urls,
      fields: fields || [],
      engine: engine || "PLAYWRIGHT_STEALTH",
      stealthMode: stealthMode !== false,
      concurrency: concurrency || 3,
      maxPagesPerTarget: paginationLimit || 5,
      crawlDepth: crawlDepth || "LEVEL_2_LISTINGS",
      paginationLimit: paginationLimit || 3,
      targetQuota: targetQuota ? Number(targetQuota) : undefined,
      isUnlimited: Boolean(isUnlimited),
      selectedFieldKeys: selectedFieldKeys || [],
      mapsQuery,
      mapsCountry,
      mapsState,
      mapsCity,
      mapsCategory,
      mapsMinRating,
      mapsMinReviews,
      mapsHasPhone,
      mapsHasWebsite,
      mapsLimit,
      progress: 0,
      totalItems: urls.length,
      processedItems: 0,
      successCount: 0,
      errorCount: 0,
      liveSyncToSheet: Boolean(liveSyncToSheet),
      spreadsheetId,
      sheetName: sheetName || "Sheet1",
      createdAt: new Date().toISOString(),
    });

    // Launch background worker runner immediately (asynchronous execution)
    const runner = new CampaignRunner();
    runner.runCampaign(campaign.id || campaignId).catch(console.error);

    return NextResponse.json({ success: true, campaign }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing campaign id" }, { status: 400 });

    const repo = new MongoCampaignRepository();
    const success = await repo.delete(id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
