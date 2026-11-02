import { NextResponse } from "next/server";
import { InMemoryJobQueue } from "@/services/queue/InMemoryJobQueue";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const queue = InMemoryJobQueue.getInstance();
    const jobs = await queue.getAllJobs();
    return NextResponse.json({ jobs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { jobId, action } = await request.json();
    if (!jobId || !action) {
      return NextResponse.json({ error: "Missing jobId or action" }, { status: 400 });
    }

    const queue = InMemoryJobQueue.getInstance();
    let success = false;

    if (action === "pause") {
      success = await queue.pauseJob(jobId);
    } else if (action === "resume") {
      success = await queue.resumeJob(jobId);
    } else if (action === "cancel") {
      success = await queue.cancelJob(jobId);
    } else {
      return NextResponse.json({ error: "Invalid action. Use 'pause', 'resume', or 'cancel'." }, { status: 400 });
    }

    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

