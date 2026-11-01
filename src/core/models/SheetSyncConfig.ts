export interface ColumnMapping {
  sheetColumn: string; // e.g. "A", "B", "C"
  sheetHeader: string; // e.g. "Company Domain", "Phone Number"
  fieldPath: string;   // e.g. "domain", "companyName", "contact.phones.0.number"
  direction: "READ" | "WRITE" | "READ_WRITE";
}

export interface SheetSyncConfig {
  _id?: string;
  id: string;
  name: string;
  spreadsheetId: string;
  sheetName: string;
  columnMappings: ColumnMapping[];
  continuousSync: boolean;
  pollIntervalSeconds: number;
  lastRowProcessed: number;
  lastSyncedAt?: string;
  status: "ACTIVE" | "PAUSED" | "ERROR";
  errorMessage?: string;
  createdAt: string;
}

