import { ScrapingCampaign } from "../core/models/Campaign";
import { getDatabase } from "../lib/mongodb";
import { ObjectId } from "mongodb";

export class MongoCampaignRepository {
  private collectionName = "scraping_campaigns";
  private static memoryStore: Map<string, ScrapingCampaign> = new Map();

  private async getCollection() {
    const db = await getDatabase();
    if (!db) return null;
    return db.collection(this.collectionName);
  }

  async getAll(): Promise<ScrapingCampaign[]> {
    const col = await this.getCollection();
    if (col) {
      const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
      return docs.map((d) => ({ ...d, _id: d._id.toString() } as unknown as ScrapingCampaign));
    }
    return Array.from(MongoCampaignRepository.memoryStore.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getById(id: string): Promise<ScrapingCampaign | null> {
    const col = await this.getCollection();
    if (col) {
      try {
        const doc = await col.findOne({ _id: new ObjectId(id) as any });
        if (doc) return { ...doc, _id: doc._id.toString() } as unknown as ScrapingCampaign;
      } catch {
        const doc = await col.findOne({ id } as any);
        if (doc) return doc as unknown as ScrapingCampaign;
      }
    }
    return MongoCampaignRepository.memoryStore.get(id) || null;
  }

  async create(campaign: Omit<ScrapingCampaign, "_id">): Promise<ScrapingCampaign> {
    const col = await this.getCollection();
    const id = campaign.id || `camp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const record: ScrapingCampaign = {
      ...campaign,
      id,
      createdAt: campaign.createdAt || new Date().toISOString(),
      logs: campaign.logs || [],
      extractedRecords: campaign.extractedRecords || [],
    };

    if (col) {
      const res = await col.insertOne(record as any);
      return { ...record, _id: res.insertedId.toString() };
    }

    MongoCampaignRepository.memoryStore.set(id, record);
    return record;
  }

  async update(id: string, updates: Partial<ScrapingCampaign>): Promise<ScrapingCampaign | null> {
    const col = await this.getCollection();
    if (col) {
      try {
        await col.updateOne({ id } as any, { $set: updates });
        return this.getById(id);
      } catch {}
    }

    const existing = MongoCampaignRepository.memoryStore.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    MongoCampaignRepository.memoryStore.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const col = await this.getCollection();
    if (col) {
      const res = await col.deleteOne({ id } as any);
      return res.deletedCount > 0;
    }
    return MongoCampaignRepository.memoryStore.delete(id);
  }

  async addLog(id: string, log: { level: "info" | "warn" | "error" | "success"; message: string }): Promise<void> {
    const entry = { ...log, timestamp: new Date().toISOString() };
    const col = await this.getCollection();
    if (col) {
      await col.updateOne({ id } as any, { $push: { logs: entry } as any });
      return;
    }
    const camp = MongoCampaignRepository.memoryStore.get(id);
    if (camp) {
      camp.logs = camp.logs || [];
      camp.logs.push(entry);
    }
  }

  async addExtractedRecords(id: string, records: Record<string, any>[]): Promise<void> {
    const col = await this.getCollection();
    if (col) {
      await col.updateOne({ id } as any, {
        $push: { extractedRecords: { $each: records } } as any,
        $inc: { successCount: records.length, processedItems: records.length } as any,
      });
      return;
    }
    const camp = MongoCampaignRepository.memoryStore.get(id);
    if (camp) {
      camp.extractedRecords = camp.extractedRecords || [];
      camp.extractedRecords.push(...records);
      camp.successCount = (camp.successCount || 0) + records.length;
      camp.processedItems = (camp.processedItems || 0) + records.length;
    }
  }
}

