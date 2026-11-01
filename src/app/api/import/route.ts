import { NextResponse } from "next/server";
import { MongoCompanyRepository } from "@/repositories/MongoCompanyRepository";
import { MongoPeopleRepository } from "@/repositories/MongoPeopleRepository";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, records, listName } = body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "No records provided" }, { status: 400 });
    }

    const companyRepo = new MongoCompanyRepository();
    const peopleRepo = new MongoPeopleRepository();

    let insertedCount = 0;

    if (type === "PEOPLE") {
      for (const r of records) {
        const fullName = r.fullName || r["Full Name"] || r.name || r["Name"];
        if (!fullName) continue;

        await peopleRepo.create({
          fullName,
          designation: r.designation || r["Designation"] || r.title || r["Title"] || "Executive",
          seniority: "GENERAL",
          department: "EXECUTIVE",
          organizationName: r.organizationName || r["Organization"] || r.company || r["Company"] || "Corporate",
          organizationDomain: r.organizationDomain || r["Domain"] || r.website || undefined,
          workEmail: r.workEmail || r["Work Email"] || r.email || r["Email"] || undefined,
          workEmailVerified: !!(r.workEmail || r.email),
          mobilePhone: r.mobilePhone || r["Mobile Phone"] || r.phone || r["Phone"] || undefined,
          whatsappAvailable: false,
          linkedinUrl: r.linkedinUrl || r["LinkedIn URL"] || r.linkedin || undefined,
          location: {
            city: r.city || r["City"] || "India",
            raw: r.address || r["Address"] || "India",
          },
          verificationStatus: "VERIFIED",
          enrichmentStatus: "PENDING",
          confidenceScore: 0.9,
          scrapedAt: new Date().toISOString(),
          source: "search_engine",
          notes: listName ? `Imported into list: ${listName}` : undefined,
        });
        insertedCount++;
      }
    } else {
      // Default: Companies / Organizations
      for (const r of records) {
        const companyName = r.companyName || r["Company Name"] || r.name || r["Name"];
        if (!companyName) continue;

        const domain = (r.domain || r["Domain"] || r.website || r["Website"] || "")
          .replace(/^https?:\/\//i, "")
          .replace(/^www\./i, "")
          .split("/")[0] || companyName.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";

        await companyRepo.create({
          domain,
          companyName,
          websiteUrl: r.websiteUrl || r["Website"] || (domain ? `https://${domain}` : undefined),
          contactPerson: r.contactPerson || r["Contact Person"] || r.contact || undefined,
          designation: r.designation || r["Designation"] || "Key Decision Maker",
          products: r.products || r["Products"] || r.description || undefined,
          phones: (r.phone || r["Primary Phone"] || r["Phone"])
            ? [{ number: r.phone || r["Primary Phone"] || r["Phone"], source: "website", verified: true }]
            : [],
          emails: (r.email || r["Corporate Email"] || r["Email"])
            ? [{ address: r.email || r["Corporate Email"] || r["Email"], type: "corporate", mxVerified: true, confidenceScore: 0.85 }]
            : [],
          addresses: (r.address || r["Address"] || r["Factory Address"])
            ? [{ fullAddress: r.address || r["Address"] || r["Factory Address"], city: r.city || r["City"] }]
            : [],
          socialProfiles: {
            linkedin: r.linkedin || r["LinkedIn"] || undefined,
            twitter: r.twitter || r["Twitter"] || undefined,
            facebook: r.facebook || r["Facebook"] || undefined,
          },
          verificationStatus: "VERIFIED",
          enrichmentStatus: "PENDING",
          confidenceScore: 0.9,
          scrapedAt: new Date().toISOString(),
          notes: listName ? `Imported into list: ${listName}` : undefined,
        });
        insertedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      insertedCount,
      message: `Successfully ingested ${insertedCount} ${type || "ORGANIZATIONS"} into Central Database! Auto-enrichment queued.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
