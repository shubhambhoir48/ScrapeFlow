import { SheetSyncConfig, ColumnMapping } from "../models/SheetSyncConfig";
import { Company } from "../models/Company";

export interface ISheetSyncService {
  testConnection(spreadsheetId: string): Promise<{ success: boolean; title?: string; sheets?: string[]; error?: string }>;
  readSheetRows(spreadsheetId: string, sheetName: string, range?: string): Promise<string[][]>;
  appendRow(spreadsheetId: string, sheetName: string, values: any[]): Promise<boolean>;
  batchUpdateRows(
    spreadsheetId: string, 
    sheetName: string, 
    mappings: ColumnMapping[], 
    companies: Company[]
  ): Promise<{ updatedCount: number; errors?: string[] }>;
  ensureHeaders(spreadsheetId: string, sheetName: string, headers: string[]): Promise<boolean>;
}

