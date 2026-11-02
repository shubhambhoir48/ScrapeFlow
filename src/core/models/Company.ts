export interface EmailRecord {
  address: string;
  type: "corporate" | "personal" | "generic";
  mxVerified: boolean;
  confidenceScore: number;
}

export interface PhoneRecord {
  number: string;
  source: "google_maps" | "website" | "social";
  verified: boolean;
}

export interface AddressRecord {
  fullAddress: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface SocialProfiles {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  github?: string;
  whatsapp?: string;
}

export interface GoogleMapsData {
  placeId?: string;
  title?: string;
  rating?: number;
  reviewCount?: number;
  businessStatus?: string;
  priceLevel?: string;
  categories?: string[];
  mapsUrl?: string;
}

export interface Company {
  _id?: string;
  id?: string;
  userId?: string;
  userEmail?: string;
  notes?: string;
  domain: string;
  companyName: string;
  tagline?: string;
  description?: string;
  industry?: string;
  websiteUrl: string;
  emails: EmailRecord[];
  phones: PhoneRecord[];
  addresses: AddressRecord[];
  socialProfiles: SocialProfiles;
  googleMaps?: GoogleMapsData;
  techStack?: string[];
  contactPerson?: string;
  designation?: string;
  products?: string;
  enrichmentStatus?: "PENDING" | "ENRICHING" | "ENRICHED" | "FAILED";
  enrichmentSources?: string[];
  unmaskedAt?: string;
  verificationStatus: "VERIFIED" | "PARTIAL" | "UNVERIFIED" | "FAILED";
  confidenceScore: number;
  scrapedAt: string;
  lastSyncedToSheet?: string;
  customFields?: Record<string, any>;
}
