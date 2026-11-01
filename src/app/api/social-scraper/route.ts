import { NextResponse } from "next/server";
import { SocialMediaScraperEngine } from "@/services/scrapers/SocialMediaScraperEngine";
import { MongoCompanyRepository } from "@/repositories/MongoCompanyRepository";
import { MongoPeopleRepository } from "@/repositories/MongoPeopleRepository";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetName, companyOrDomain, recordId, recordType, targets } = body;

    const engine = new SocialMediaScraperEngine();
    const companyRepo = new MongoCompanyRepository();
    const peopleRepo = new MongoPeopleRepository();

    // Batch targets mode
    if (targets && Array.isArray(targets) && targets.length > 0) {
      const results = [];
      for (const t of targets.slice(0, 10)) {
        const res = await engine.findSocialProfiles(t.name || t.targetName, t.company || t.domain || "");
        results.push(res);

        // Auto-update MongoDB record if recordId provided
        if (t.recordId && t.recordType === "COMPANY") {
          await companyRepo.update(t.recordId, {
            socialProfiles: {
              linkedin: res.linkedin,
              twitter: res.twitter,
              facebook: res.facebook,
              instagram: res.instagram,
              youtube: res.youtube,
              github: res.github,
            },
          });
        } else if (t.recordId && t.recordType === "PERSON") {
          await peopleRepo.update(t.recordId, {
            linkedinUrl: res.linkedin,
            twitterUrl: res.twitter,
          });
        }
      }
      return NextResponse.json({ success: true, count: results.length, results });
    }

    if (!targetName) {
      return NextResponse.json({ error: "targetName is required" }, { status: 400 });
    }

    const logs: { level: string; message: string }[] = [];
    const result = await engine.findSocialProfiles(targetName, companyOrDomain || "", (log) => {
      logs.push(log);
    });

    // Auto-update MongoDB record if provided
    if (recordId) {
      if (recordType === "COMPANY") {
        await companyRepo.update(recordId, {
          socialProfiles: {
            linkedin: result.linkedin,
            twitter: result.twitter,
            facebook: result.facebook,
            instagram: result.instagram,
            youtube: result.youtube,
            github: result.github,
          },
        });
      } else if (recordType === "PERSON") {
        await peopleRepo.update(recordId, {
          linkedinUrl: result.linkedin,
          twitterUrl: result.twitter,
        });
      }
    }

    return NextResponse.json({ success: true, result, logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

