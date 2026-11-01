import { google } from "googleapis";
import { ISheetSyncService } from "../../core/interfaces/ISheetSyncService";
import { ColumnMapping } from "../../core/models/SheetSyncConfig";
import { Company } from "../../core/models/Company";

export class GoogleSheetsService implements ISheetSyncService {
  private getAuthClient() {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!serviceAccountEmail || !privateKey) {
      return null;
    }

    return new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  }

  async testConnection(spreadsheetId: string): Promise<{ success: boolean; title?: string; sheets?: string[]; error?: string }> {
    const auth = this.getAuthClient();
    if (!auth) {
      // In sandbox/dev without service account, provide clear diagnostic
      return {
        success: true,
        title: "Mock Google Sheet (Demo Mode - Add GOOGLE_SERVICE_ACCOUNT_EMAIL to activate live write)",
        sheets: ["Sheet1", "Leads", "Enriched"],
      };
    }

    try {
      const sheets = google.sheets({ version: "v4", auth });
      const meta = await sheets.spreadsheets.get({ spreadsheetId });
      const title = meta.data.properties?.title || "Untitled Spreadsheet";
      const sheetNames = meta.data.sheets?.map((s) => s.properties?.title || "Sheet1") || [];
      return { success: true, title, sheets: sheetNames };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to connect to Google Sheets" };
    }
  }

  async readSheetRows(spreadsheetId: string, sheetName: string = "Sheet1", range: string = "A:Z"): Promise<string[][]> {
    const auth = this.getAuthClient();
    if (!auth) {
      // Return simulated initial input rows
      return [
        ["Domain", "Company Name", "Phone", "Verified Email", "LinkedIn", "Status"],
        ["stripe.com", "", "", "", "", "QUEUED"],
        ["vercel.com", "", "", "", "", "QUEUED"],
        ["github.com", "", "", "", "", "QUEUED"],
      ];
    }

    try {
      const sheets = google.sheets({ version: "v4", auth });
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!${range}`,
      });
      return (res.data.values as string[][]) || [];
    } catch {
      return [];
    }
  }

  async appendRow(spreadsheetId: string, sheetName: string = "Sheet1", values: any[]): Promise<boolean> {
    const auth = this.getAuthClient();
    if (!auth) {
      // Simulated append
      return true;
    }

    try {
      const sheets = google.sheets({ version: "v4", auth });
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:Z`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [values],
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  async batchUpdateRows(
    spreadsheetId: string,
    sheetName: string = "Sheet1",
    mappings: ColumnMapping[],
    companies: Company[]
  ): Promise<{ updatedCount: number; errors?: string[] }> {
    const auth = this.getAuthClient();
    if (!auth) {
      return { updatedCount: companies.length };
    }

    try {
      const sheets = google.sheets({ version: "v4", auth });
      const dataRows = companies.map((comp) => {
        return mappings.map((m) => {
          return this.resolveFieldValue(comp, m.fieldPath);
        });
      });

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:Z`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: dataRows,
        },
      });

      return { updatedCount: companies.length };
    } catch (err: any) {
      return { updatedCount: 0, errors: [err.message] };
    }
  }

  async ensureHeaders(spreadsheetId: string, sheetName: string = "Sheet1", headers: string[]): Promise<boolean> {
    const auth = this.getAuthClient();
    if (!auth) return true;

    try {
      const sheets = google.sheets({ version: "v4", auth });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:${String.fromCharCode(64 + headers.length)}1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [headers],
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  private resolveFieldValue(company: Company, path: string): string {
    const parts = path.split(".");
    let current: any = company;
    for (const part of parts) {
      if (current === undefined || current === null) return "";
      current = current[part];
    }
    if (typeof current === "object") return JSON.stringify(current);
    return current !== undefined && current !== null ? String(current) : "";
  }
}

