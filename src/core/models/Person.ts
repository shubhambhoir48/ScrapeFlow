export type SeniorityLevel =
  | "FOUNDER"
  | "C_SUITE"
  | "VP"
  | "DIRECTOR"
  | "BOARD_MEMBER"
  | "CHAIRMAN"
  | "ADVISOR"
  | "HEAD_OF_DEPT"
  | "MANAGER"
  | "MARKETING"
  | "SALES"
  | "CUSTOMER_SUPPORT"
  | "GENERAL";

export type Department =
  | "EXECUTIVE"
  | "ENGINEERING"
  | "SALES"
  | "MARKETING"
  | "PRODUCT"
  | "FINANCE"
  | "OPERATIONS"
  | "HUMAN_RESOURCES"
  | "LEGAL"
  | "CUSTOMER_SUCCESS"
  | "GENERAL";

export interface Person {
  _id?: string;
  id?: string;
  userId?: string;
  userEmail?: string;
  notes?: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  designation: string; // e.g. "Founder & Chief Executive Officer"
  seniority: SeniorityLevel;
  department: Department;
  organizationName: string;
  organizationDomain: string;
  workEmail?: string;
  workEmailVerified: boolean;
  personalEmail?: string;
  phone?: string;
  mobilePhone?: string;
  whatsapp?: string;
  whatsappAvailable: boolean;
  linkedinUrl?: string;
  twitterUrl?: string;
  facebookUrl?: string;
  website?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
    raw?: string;
  };
  experienceSummary?: string;
  education?: string;
  skills?: string[];
  enrichmentStatus?: "PENDING" | "ENRICHING" | "ENRICHED";
  verificationStatus: "VERIFIED" | "PARTIAL" | "UNVERIFIED";
  confidenceScore: number;
  scrapedAt: string;
  source: "team_page" | "search_engine" | "social_profile" | "schema_org";
}
