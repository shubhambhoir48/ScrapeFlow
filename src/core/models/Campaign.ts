export type CampaignType =
  | "DIRECTORY_SCRAPER"     // e.g. Maharashtra Directory, YellowPages, business catalogs
  | "B2B_COMPANY_PEOPLE"    // Company intelligence, executive decision makers, MX emails
  | "WEBSITE_CRAWLER"       // Deep multi-page crawl, articles, docs
  | "SMART_EXTRACTOR"       // Custom selector / visual field extractor
  | "GOOGLE_MAPS";          // Places, ratings, reviews, geo-data

export type CampaignStatus = "DRAFT" | "QUEUED" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED";

export interface CampaignFieldDef {
  name: string;
  selector?: string;
  type: "text" | "link" | "email" | "phone" | "image" | "price" | "table";
}

export interface ScrapingCampaign {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  targetUrls: string[];
  fields: CampaignFieldDef[];
  engine: "PLAYWRIGHT_STEALTH" | "FAST_HTTP";
  stealthMode: boolean;
  concurrency: number;
  maxPagesPerTarget: number;

  // Multi-Level Deep Crawling & Field Selection
  crawlDepth?: "LEVEL_1_DIRECT" | "LEVEL_2_LISTINGS" | "LEVEL_3_DEEP_DETAILS";
  paginationLimit?: number;
  targetQuota?: number;
  isUnlimited?: boolean;
  selectedFieldKeys?: string[];
  targetCategoryUrl?: string;

  // Google Maps Scraper Parameters
  mapsQuery?: string;
  mapsCountry?: string;
  mapsState?: string;
  mapsCity?: string;
  mapsCategory?: string;
  mapsMinRating?: number;
  mapsMinReviews?: number;
  mapsHasPhone?: boolean;
  mapsHasWebsite?: boolean;
  mapsLimit?: number;

  // Progress
  progress: number;
  totalItems: number;
  processedItems: number;
  successCount: number;
  errorCount: number;

  // Google Sheets sync
  liveSyncToSheet?: boolean;
  spreadsheetId?: string;
  sheetName?: string;

  // Results
  extractedRecords?: Record<string, any>[];
  logs?: Array<{ timestamp: string; level: "info" | "warn" | "error" | "success"; message: string }>;

  // Resumability Checkpoint & Fault-Tolerance
  checkpoint?: {
    lastPathwayIndex?: number;
    lastListingUrl?: string;
    listingUrlsToCrawl?: string[];
    totalPathways?: number;
    lastPageNum?: number;
    lastUpdated?: string;
  };
  isPaused?: boolean;

  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}
