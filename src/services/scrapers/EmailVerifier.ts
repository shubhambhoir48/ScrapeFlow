import { IVerificationService } from "../../core/interfaces/IVerificationService";
import { EmailRecord, PhoneRecord } from "../../core/models/Company";
import dns from "dns";

export class EmailVerifier implements IVerificationService {
  private emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private genericPrefixes = ["info", "contact", "support", "hello", "sales", "team", "admin", "office"];

  async verifyEmail(email: string): Promise<EmailRecord> {
    const cleanEmail = email.trim().toLowerCase();
    
    // 1. Syntax Check
    if (!this.emailRegex.test(cleanEmail)) {
      return {
        address: cleanEmail,
        type: "generic",
        mxVerified: false,
        confidenceScore: 0.1,
      };
    }

    const domain = cleanEmail.split("@")[1];
    const prefix = cleanEmail.split("@")[0];
    const isGeneric = this.genericPrefixes.includes(prefix);

    // 2. DNS MX Record Lookup
    let mxVerified = false;
    try {
      const mxRecords = await dns.promises.resolveMx(domain);
      mxVerified = mxRecords && mxRecords.length > 0;
    } catch {
      mxVerified = false;
    }

    const confidenceScore = mxVerified ? (isGeneric ? 0.85 : 0.95) : 0.3;

    return {
      address: cleanEmail,
      type: isGeneric ? "generic" : "corporate",
      mxVerified,
      confidenceScore,
    };
  }

  async verifyPhone(phone: string): Promise<PhoneRecord> {
    // Basic phone sanitizer & verification
    const digitsOnly = phone.replace(/[^0-9+]/g, "");
    const isValid = digitsOnly.length >= 7 && digitsOnly.length <= 16;
    return {
      number: phone.trim(),
      source: "website",
      verified: isValid,
    };
  }

  async verifyDomain(domain: string): Promise<{ hasMx: boolean; resolves: boolean; nameservers: string[] }> {
    let hasMx = false;
    let resolves = false;
    let nameservers: string[] = [];

    try {
      const addresses = await dns.promises.resolve(domain);
      resolves = addresses && addresses.length > 0;
    } catch {
      resolves = false;
    }

    try {
      const mx = await dns.promises.resolveMx(domain);
      hasMx = mx && mx.length > 0;
    } catch {
      hasMx = false;
    }

    try {
      nameservers = await dns.promises.resolveNs(domain);
    } catch {
      nameservers = [];
    }

    return { hasMx, resolves, nameservers };
  }
}

