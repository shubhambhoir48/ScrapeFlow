import { NextResponse } from "next/server";
import { MongoCampaignRepository } from "@/repositories/MongoCampaignRepository";

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

