export type UserRole = "SUPER_ADMIN" | "ADMIN" | "MEMBER";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  organizationId?: string;
  plan: "FREE_TIER" | "PRO" | "ENTERPRISE";
  createdAt: string;
  lastLoginAt: string;
}

