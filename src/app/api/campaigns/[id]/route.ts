import { NextResponse } from "next/server";
import { MongoCampaignRepository } from "@/repositories/MongoCampaignRepository";
import { CampaignRunner } from "@/services/scrapers/CampaignRunner";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const repo = new MongoCampaignRepository();
    const campaign = await repo.getById(params.id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    return NextResponse.json({ campaign });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const action = body.action; // "resume" | "pause"
    const repo = new MongoCampaignRepository();
    const campaign = await repo.getById(params.id);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (action === "resume") {
      await repo.update(params.id, {
        status: "RUNNING",
        isPaused: false,
      });
      await repo.addLog(params.id, {
        level: "info",
        message: `[Resume Engine] Resuming campaign from pathway checkpoint (Pathway ${(campaign.checkpoint?.lastPathwayIndex || 0) + 1}/${campaign.checkpoint?.totalPathways || "N/A"})...`,
      });

      // Launch background execution resuming from checkpoint
      const runner = new CampaignRunner();
      runner.runCampaign(params.id).catch((err: any) => {
        console.error("Resume error:", err);
      });

      const updated = await repo.getById(params.id);
      return NextResponse.json({ success: true, message: "Campaign resumed successfully", campaign: updated });
    }

    if (action === "pause") {
      await repo.update(params.id, {
        status: "PAUSED",
        isPaused: true,
      });
      await repo.addLog(params.id, {
        level: "info",
        message: `[Control] Campaign paused by user. State and frontier saved for resumption.`,
      });
      const updated = await repo.getById(params.id);
      return NextResponse.json({ success: true, message: "Campaign paused", campaign: updated });
    }

    return NextResponse.json({ error: "Invalid action. Supported: 'resume' or 'pause'" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

