export type AudienceType =
  | "PROFESSIONAL"
  | "ORGANIZATION"
  | "GOVERNMENT"
  | "ACADEMIC"
  | "NON_PROFIT"
  | "LOCAL_BUSINESS";

export type DataEntityType = "PEOPLE" | "ORGANIZATION" | "BOTH";

export interface PeopleFieldSelection {
  fullName: boolean;
  designation: boolean;
  workEmail: boolean;
  personalEmail: boolean;
  phone: boolean;
  whatsapp: boolean;
  linkedin: boolean;
  twitter: boolean;
  facebook: boolean;
  website: boolean;
  experience: boolean;
  education: boolean;
  location: boolean;
}

export interface OrganizationFieldSelection {
  companyName: boolean;
  websiteUrl: boolean;
  corporateEmails: boolean;
  phoneNumbers: boolean;
  googleMapsRating: boolean;
  physicalAddress: boolean;
  socialChannels: boolean;
  techStack: boolean;
  employeeCount: boolean;
}

export interface AdvancedScraperParameters {
  audienceType: AudienceType;
  entityType: DataEntityType;
  selectedSeniorities: string[];
  selectedDepartments: string[];
  customDesignationKeywords: string[];
  peopleFields: PeopleFieldSelection;
  organizationFields: OrganizationFieldSelection;
  scrapeDepth: "QUICK" | "DEEP" | "EXTENSIVE";
  verifyMxRecords: boolean;
  formatWhatsappPhone: boolean;
}

export interface DetectedField {
  id: string;
  name: string;
  selector: string;
  type: "text" | "link" | "image" | "number" | "price" | "email" | "table";
  sampleValue?: string;
  confidence: number;
  selected: boolean;
}

export interface SmartScrapeConfig {
  targetUrl: string;
  name: string;
  detectedFields: DetectedField[];
  maxPages: number;
  paginationType: "none" | "url_param" | "next_button" | "infinite_scroll";
  paginationSelector?: string;
  exportToSheet: boolean;
  spreadsheetId?: string;
}

export interface GlobalSettings {
  concurrencyLimit: number;
  rateLimitDelayMs: number;
  useProxyRotation: boolean;
  proxyList: string[];
  stealthMode: boolean;
  searxngEndpoint?: string;
  googleServiceAccountEmail?: string;
  googlePrivateKey?: string;
}
