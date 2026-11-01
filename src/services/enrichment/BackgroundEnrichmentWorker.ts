import { MongoCompanyRepository } from "../../repositories/MongoCompanyRepository";
import { MongoPeopleRepository } from "../../repositories/MongoPeopleRepository";
import { AutonomousCascadeEnricher } from "./AutonomousCascadeEnricher";

export class BackgroundEnrichmentWorker {
  private static instance: BackgroundEnrichmentWorker;
  private companyRepo = new MongoCompanyRepository();
  private peopleRepo = new MongoPeopleRepository();
  private enricher = new AutonomousCascadeEnricher();
  private isRunning = false;

  static getInstance(): BackgroundEnrichmentWorker {
    if (!BackgroundEnrichmentWorker.instance) {
      BackgroundEnrichmentWorker.instance = new BackgroundEnrichmentWorker();
    }
    return BackgroundEnrichmentWorker.instance;
  }

  /**
   * Enrich a single company by ID
   */
  async enrichCompanyById(companyId: string): Promise<boolean> {
    const comp = await this.companyRepo.findById(companyId);
    if (!comp) return false;

    await this.companyRepo.update(companyId, { enrichmentStatus: "ENRICHING" });

    try {
      const city = comp.addresses?.[0]?.city || "";
      const address = comp.addresses?.[0]?.fullAddress || "";
      const contactPerson = comp.contactPerson || "";

      const enriched = await this.enricher.enrichCompany(
        comp.companyName,
        city,
        address,
        contactPerson
      );

      // Merge phones
      const newPhones = [...(comp.phones || [])];
      if (enriched.unmaskedPhone) {
        newPhones.unshift({
          number: enriched.unmaskedPhone,
          source: "google_maps",
          verified: true,
        });
      }
      if (enriched.alternatePhones) {
        for (const ap of enriched.alternatePhones) {
          if (!newPhones.some((p) => p.number === ap)) {
            newPhones.push({ number: ap, source: "website", verified: true });
          }
        }
      }

      // Merge emails
      const newEmails = [...(comp.emails || [])];
      if (enriched.corporateEmail) {
        newEmails.unshift({
          address: enriched.corporateEmail,
          type: "corporate",
          mxVerified: true,
          confidenceScore: 0.98,
        });
      }
      if (enriched.alternateEmails) {
        for (const ae of enriched.alternateEmails) {
          if (!newEmails.some((e) => e.address === ae)) {
            newEmails.push({
              address: ae,
              type: "generic",
              mxVerified: true,
              confidenceScore: 0.9,
            });
          }
        }
      }

      // Merge addresses
      const newAddresses = [...(comp.addresses || [])];
      if (enriched.fullAddress && newAddresses.length > 0) {
        newAddresses[0].fullAddress = enriched.fullAddress;
      }

      // Update company in Atlas
      await this.companyRepo.update(companyId, {
        phones: newPhones,
        emails: newEmails,
        addresses: newAddresses,
        websiteUrl: enriched.websiteUrl || comp.websiteUrl,
        socialProfiles: {
          ...comp.socialProfiles,
          ...enriched.socialProfiles,
        },
        googleMaps: {
          ...comp.googleMaps,
          rating: enriched.googleMapsRating || comp.googleMaps?.rating,
        },
        enrichmentStatus: "ENRICHED",
        enrichmentSources: enriched.sourcesConsulted,
        unmaskedAt: new Date().toISOString(),
        confidenceScore: Math.max(comp.confidenceScore, enriched.confidenceScore),
      });

      // Also enrich matching Person record
      if (comp.contactPerson) {
        const person = await this.peopleRepo.findOne({
          organizationName: comp.companyName,
        });
        if (person && person._id) {
          await this.peopleRepo.update(person._id, {
            mobilePhone: enriched.unmaskedPhone || person.mobilePhone,
            phone: enriched.alternatePhones?.[0] || person.phone,
            workEmail: enriched.corporateEmail || person.workEmail,
            workEmailVerified: !!enriched.corporateEmail,
            whatsapp: enriched.socialProfiles?.whatsapp || person.whatsapp,
            whatsappAvailable: !!enriched.socialProfiles?.whatsapp,
            linkedinUrl: enriched.socialProfiles?.linkedin || person.linkedinUrl,
            enrichmentStatus: "ENRICHED",
          });
        }
      }

      return true;
    } catch (err: any) {
      console.error("Enrichment failed for company:", companyId, err.message);
      await this.companyRepo.update(companyId, { enrichmentStatus: "FAILED" });
      return false;
    }
  }

  /**
   * Process all pending records in the background continuously
   */
  async processPendingQueue(): Promise<number> {
    if (this.isRunning) return 0;
    this.isRunning = true;

    try {
      const { items } = await this.companyRepo.find({ limit: 20 });
      const pending = items.filter((c) => !c.enrichmentStatus || c.enrichmentStatus === "PENDING");

      let processed = 0;
      for (const comp of pending) {
        if (!comp._id) continue;
        await this.enrichCompanyById(comp._id);
        processed++;
        // Polite delay between cascade queries
        await new Promise((r) => setTimeout(r, 2000));
      }

      return processed;
    } finally {
      this.isRunning = false;
    }
  }
}

