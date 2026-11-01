import { Company } from "../models/Company";

export interface EnrichmentOptions {
  scrapeWebsite?: boolean;
  scrapeGoogleMaps?: boolean;
  scrapeSocials?: boolean;
  verifyEmails?: boolean;
  liveSyncToSheet?: boolean;
  spreadsheetId?: string;
  sheetName?: string;
}

export interface IEnrichmentService {
  enrichCompany(target: string, options?: EnrichmentOptions): Promise<Company>;
  enrichBatch(targets: string[], options?: EnrichmentOptions, onProgress?: (p: number, current: Company) => void): Promise<Company[]>;
}

