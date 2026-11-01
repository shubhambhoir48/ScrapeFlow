import { NextResponse } from "next/server";
import { CompanyEnrichmentOrchestrator } from "@/services/enrichment/CompanyEnrichmentOrchestrator";
import { InMemoryJobQueue } from "@/services/queue/InMemoryJobQueue";
import { BackgroundEnrichmentWorker } from "@/services/enrichment/BackgroundEnrichmentWorker";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      companyId,
      runPending,
      target,
      targets,
      runInBackground,
      liveSyncToSheet,
      spreadsheetId,
      sheetName,
      audienceType,
      entityType,
      selectedSeniorities,
      selectedDepartments,
      customKeywords,
      depth,
    } = body;

    // Handle single company cascade enrichment or pending queue
    if (companyId) {
      const worker = BackgroundEnrichmentWorker.getInstance();
      const success = await worker.enrichCompanyById(companyId);
      return NextResponse.json({ success, companyId });
    }

    if (runPending) {
      const worker = BackgroundEnrichmentWorker.getInstance();
      worker.processPendingQueue().catch(console.error);
      return NextResponse.json({ success: true, message: "Autonomous cascade enrichment fleet started." });
    }

    const list: string[] = targets || (target ? [target] : []);
    if (list.length === 0) {
      return NextResponse.json({ error: "Missing 'target' or 'targets' in request body." }, { status: 400 });
    }

    if (runInBackground || list.length > 2) {
      const queue = InMemoryJobQueue.getInstance();
      const job = await queue.addJob(
        `Batch: ${entityType || "Full"} Scraping (${list.length} targets)`,
        "COMPANY_ENRICHMENT",
        {
          targets: list,
          liveSyncToSheet: Boolean(liveSyncToSheet),
          spreadsheetId,
          sheetName: sheetName || "Sheet1",
          audienceType,
          entityType: entityType || "BOTH",
          selectedSeniorities,
          selectedDepartments,
          customKeywords,
          depth,
        }
      );
      return NextResponse.json({
        queued: true,
        jobId: job.id,
        message: "Job dispatched to background worker fleet.",
      });
    }

    // Direct synchronous execution
    const orchestrator = new CompanyEnrichmentOrchestrator();
    const enriched = await orchestrator.enrichCompany(list[0], {
      liveSyncToSheet: Boolean(liveSyncToSheet),
      spreadsheetId,
      sheetName,
      audienceType,
      entityType: entityType || "BOTH",
      selectedSeniorities,
      selectedDepartments,
      customKeywords,
      depth,
    });

    return NextResponse.json({ queued: false, data: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
