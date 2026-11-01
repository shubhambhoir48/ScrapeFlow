import * as cheerio from "cheerio";

export interface UnmaskedCompanyData {
  companyName: string;
  contactPerson: string;
  designation: string;
  phone: string;
  email: string;
  website: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  products: string[];
  imageUrl?: string;
  companyId?: string;
  companyInfoUrl?: string;
  catalogUrl?: string;
  isVerified: boolean;
  notes?: string;
}

export class DataUnmasker {
  /**
   * Deeply extracts and de-obfuscates data from a single HTML page or Cheerio instance
   */
  static extractFromHtml(html: string, pageUrl: string): UnmaskedCompanyData {
    const $ = cheerio.load(html);

    // 1. Audit Schema.org JSON-LD (Search engine crawler unmasking)
    let jsonLdBusiness: any = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const text = $(el).html();
        if (text) {
          const parsed = JSON.parse(text);
          if (
            parsed["@type"] &&
            (Array.isArray(parsed["@type"])
              ? parsed["@type"].some((t: string) => ["LocalBusiness", "Organization", "Corporation"].includes(t))
              : ["LocalBusiness", "Organization", "Corporation"].includes(parsed["@type"]))
          ) {
            jsonLdBusiness = parsed;
          }
        }
      } catch {}
    });

    let companyName = "";
    let streetAddress = "";
    let city = "";
    let state = "";
    let postalCode = "";
    let contactPerson = "";
    let designation = "";
    let imageUrl = "";

    if (jsonLdBusiness) {
      companyName = jsonLdBusiness.name || "";
      imageUrl = jsonLdBusiness.image || "";
      if (jsonLdBusiness.address) {
        streetAddress = jsonLdBusiness.address.streetAddress || "";
        city = jsonLdBusiness.address.addressLocality || "";
        state = jsonLdBusiness.address.addressRegion || "";
        postalCode = jsonLdBusiness.address.postalCode || "";
      }
      if (jsonLdBusiness.employee) {
        const rawEmp = jsonLdBusiness.employee.name || "";
        const parsedEmp = this.parseContactAndDesignation(rawEmp);
        contactPerson = parsedEmp.contactPerson;
        designation = parsedEmp.designation;
      }
    }

    // 2. DOM Fallbacks for Company Name
    if (!companyName) {
      companyName =
        $("h1").first().text().trim() ||
        $(".rc-title a").first().text().trim() ||
        $(".company-name").first().text().trim() ||
        $('meta[property="og:title"]').attr("content") ||
        "";
    }

    // 3. Unmask Contact Person & Designation from title attribute or headings
    if (!contactPerson) {
      // Check title attributes on links: title="Contact: MR. JATIN SHAH / MR. ROMIL SHAH (PROPRIETOR)"
      let titleAttr = "";
      $("[title*='Contact:'], [title*='contact:']").each((_, el) => {
        if (!titleAttr) titleAttr = $(el).attr("title") || "";
      });

      if (titleAttr) {
        const parsedEmp = this.parseContactAndDesignation(titleAttr);
        contactPerson = parsedEmp.contactPerson;
        if (!designation) designation = parsedEmp.designation;
      }
    }

    // Check DOM for contact person pattern e.g. "MR. ... (PROPRIETOR)"
    if (!contactPerson) {
      const bodyText = $("body").text();
      const personMatch = bodyText.match(/(?:MR\.|MS\.|MRS\.|DR\.)\s+[A-Z\s/]+(?:\((?:PROPRIETOR|DIRECTOR|PARTNER|FOUNDER|CEO|MANAGER)\))?/);
      if (personMatch) {
        const parsed = this.parseContactAndDesignation(personMatch[0]);
        contactPerson = parsed.contactPerson;
        if (!designation) designation = parsed.designation;
      }
    }

    // 4. De-obfuscate Phone Number
    let phone = "";
    // Tel links
    const telLink = $('a[href^="tel:"]').first().attr("href")?.replace(/^tel:/i, "");
    if (telLink) phone = telLink.trim();

    // Data-phone / data-mob attributes
    if (!phone) {
      $("[data-phone], [data-mob], [data-mobile], [data-tel]").each((_, el) => {
        if (phone) return;
        const val =
          $(el).attr("data-phone") ||
          $(el).attr("data-mob") ||
          $(el).attr("data-mobile") ||
          $(el).attr("data-tel") ||
          "";
        if (val && val.length >= 8) phone = val.trim();
      });
    }

    // Check if phone is masked behind OTP
    let isMaskedBehindOtp = false;
    if ($(".view-number-link, [data-open-otp], [data-view-phone]").length > 0) {
      isMaskedBehindOtp = true;
    }

    // Regex check in text
    if (!phone) {
      const phoneMatch = $("body").text().match(/(?:\+91[-\s]?)?[6-9]\d{9}/);
      if (phoneMatch) {
        phone = phoneMatch[0].trim();
      } else if (isMaskedBehindOtp) {
        phone = "[Protected via SMS OTP]";
      }
    }

    // 5. De-obfuscate Email
    let email = "";
    const mailto = $('a[href^="mailto:"]').first().attr("href")?.replace(/^mailto:/i, "");
    if (mailto) email = mailto.trim();

    if (!email) {
      const emailMatch = $("body").text().match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
      if (emailMatch && !emailMatch[0].includes("example.com")) {
        email = emailMatch[0].trim();
      }
    }

    // 6. Address parsing from text if JSON-LD missing
    if (!streetAddress) {
      const addrEl = $("address, .address, [class*='address']").first().text().replace(/\s+/g, " ").trim();
      if (addrEl) {
        streetAddress = addrEl;
        const pinMatch = addrEl.match(/\b\d{6}\b/);
        if (pinMatch) postalCode = pinMatch[0];
      }
    }

    // 7. Extract Products List
    const products: string[] = [];
    $(".prod-name, [class*='prod-name'], .product-item, .card-title").each((_, el) => {
      const name = $(el).text().trim();
      if (name.length > 2 && name.length < 60 && !products.includes(name)) {
        products.push(name);
      }
    });

    // 8. Website link
    let website = "";
    $('a[href^="http"]:not([href*="maharashtradirectory"]):not([href*="google"]):not([href*="facebook"]):not([href*="twitter"]):not([href*="linkedin"])').each((_, el) => {
      if (!website) {
        const href = $(el).attr("href");
        if (href && !href.includes("mipl.co.in") && !href.includes("cloudflare")) {
          website = href;
        }
      }
    });

    return {
      companyName: companyName.slice(0, 100),
      contactPerson: contactPerson.slice(0, 80),
      designation: designation || "Executive",
      phone,
      email,
      website: website || pageUrl,
      streetAddress: streetAddress.slice(0, 160),
      city: city || "Mumbai",
      state: state || "MAHARASHTRA",
      postalCode,
      products: products.slice(0, 12),
      imageUrl,
      isVerified: true,
      notes: isMaskedBehindOtp ? "Direct phone behind portal OTP. Contact person & full street address unmasked." : undefined,
    };
  }

  /**
   * Helper to parse "MR. JATIN SHAH / MR. ROMIL SHAH (PROPRIETOR)"
   */
  static parseContactAndDesignation(rawString: string): { contactPerson: string; designation: string } {
    let raw = rawString.replace(/^Contact:\s*/i, "").trim();
    let designation = "";
    const desigMatch = raw.match(/\(([^)]+)\)$/);
    if (desigMatch) {
      designation = desigMatch[1].trim();
      raw = raw.replace(/\(([^)]+)\)$/, "").trim();
    } else {
      // Check common keywords
      if (/proprietor/i.test(raw)) designation = "PROPRIETOR";
      else if (/director/i.test(raw)) designation = "DIRECTOR";
      else if (/partner/i.test(raw)) designation = "PARTNER";
      else if (/founder/i.test(raw)) designation = "FOUNDER";
      else if (/ceo/i.test(raw)) designation = "CEO";
      else if (/manager/i.test(raw)) designation = "MANAGER";
    }

    return {
      contactPerson: raw.replace(/\b(PROPRIETOR|DIRECTOR|PARTNER|FOUNDER|CEO|MANAGER)\b/gi, "").trim(),
      designation,
    };
  }
}

