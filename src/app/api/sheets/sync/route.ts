import { NextResponse } from "next/server";
import { GoogleSheetsService } from "@/services/sheets/GoogleSheetsService";
import { InMemoryJobQueue } from "@/services/queue/InMemoryJobQueue";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, spreadsheetId, sheetName } = body;

    const sheets = new GoogleSheetsService();

    if (action === "test") {
      const result = await sheets.testConnection(spreadsheetId);
      return NextResponse.json(result);
    }

    if (action === "read_targets") {
      const rows = await sheets.readSheetRows(spreadsheetId, sheetName || "Sheet1");
      const headers = rows[0] || [];
      const dataRows = rows.slice(1);
      // Find domain/company column
      const targets = dataRows.map((r) => r[0]).filter((v) => Boolean(v && v.trim()));

      return NextResponse.json({
        totalRows: dataRows.length,
        headers,
        targets,
      });
    }

    if (action === "start_sheet_scrape") {
      const rows = await sheets.readSheetRows(spreadsheetId, sheetName || "Sheet1");
      const targets = rows.slice(1).map((r) => r[0]).filter((v) => Boolean(v && v.trim()));

      const queue = InMemoryJobQueue.getInstance();
      const job = await queue.addJob(
        `Google Sheet Live Scraping (${spreadsheetId.slice(0, 10)}...)`,
        "GOOGLE_SHEET_SYNC",
        {
          targets,
          liveSyncToSheet: true,
          spreadsheetId,
          sheetName: sheetName || "Sheet1",
        }
      );

      return NextResponse.json({
        queued: true,
        jobId: job.id,
        targetsCount: targets.length,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

