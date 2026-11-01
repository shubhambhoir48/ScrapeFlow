export type JobType = 
  | "COMPANY_ENRICHMENT" 
  | "URL_SMART_SCRAPE" 
  | "GOOGLE_SHEET_SYNC" 
  | "BATCH_SCRAPE";

export type JobStatus = 
  | "QUEUED" 
  | "RUNNING" 
  | "PAUSED" 
  | "COMPLETED" 
  | "FAILED" 
  | "CANCELLED";

export interface JobLog {
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
  metadata?: Record<string, any>;
}

export interface ScrapingJob {
  _id?: string;
  id: string;
  name: string;
  type: JobType;
  status: JobStatus;
  progress: number; // 0 - 100
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  payload: Record<string, any>;
  logs: JobLog[];
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

