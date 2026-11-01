import { EmailRecord, PhoneRecord } from "../models/Company";

export interface IVerificationService {
  verifyEmail(email: string): Promise<EmailRecord>;
  verifyPhone(phone: string, countryCode?: string): Promise<PhoneRecord>;
  verifyDomain(domain: string): Promise<{
    hasMx: boolean;
    resolves: boolean;
    nameservers: string[];
  }>;
}

