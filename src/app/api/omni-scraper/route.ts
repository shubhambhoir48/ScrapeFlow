import { NextResponse } from "next/server";
import { OmniPipelineManager } from "@/services/scrapers/OmniPipelineManager";
import { OmniScrapeConfig } from "@/services/scrapers/OmniChannelScraperEngine";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const manager = OmniPipelineManager.getInstance();

  if (id) {
    const campaign = manager.getCampaign(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    return NextResponse.json({ campaign });
  }

  const campaigns = manager.getAllCampaigns();
  return NextResponse.json({ campaigns });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { organizations, config, name } = body;

    if (!organizations || !Array.isArray(organizations) || organizations.length === 0) {
      return NextResponse.json(
        { error: "Please provide a valid array of target organization names." },
        { status: 400 }
      );
    }

    const cleanOrgs = organizations
      .map((o: string) => (typeof o === "string" ? o.trim() : ""))
      .filter(Boolean);

    if (cleanOrgs.length === 0) {
      return NextResponse.json(
        { error: "No non-empty organization names were found." },
        { status: 400 }
      );
    }

    const defaultConfig: OmniScrapeConfig = {
      extractPeople: true,
      targetSeniorities: ["CHAIRMAN", "DIRECTOR", "BOARD_MEMBER", "C_SUITE", "VP", "HEAD_OF_DEPT", "MANAGER", "GENERAL"],
      targetDepartments: ["EXECUTIVE", "ENGINEERING", "MARKETING", "SALES", "OPERATIONS", "HUMAN_RESOURCES", "FINANCE"],
      maxPeoplePerOrg: 100,
      extractEmails: true,
      extractPhones: true,
      extractSocial: true,
      extractOrgDetails: true,
      extractGoogleMaps: true,
      depth: "COMPREHENSIVE_ABM",
    };

    const finalConfig: OmniScrapeConfig = {
      ...defaultConfig,
      ...(config || {}),
    };

    const manager = OmniPipelineManager.getInstance();
    const campaign = manager.createCampaign(cleanOrgs, finalConfig, name);

    return NextResponse.json({
      success: true,
      message: `Omni-Channel Harvest initiated in background for ${cleanOrgs.length} organizations.`,
      campaign,
    });
  } catch (err: any) {
    console.error("Omni-Scraper API Error:", err);
    return NextResponse.json({ error: err.message || "Failed to start Omni Scraper" }, { status: 500 });
  }
}
