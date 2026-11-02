import { ScrapingCampaign } from "../core/models/Campaign";
import { getDatabase } from "../lib/mongodb";
import { ObjectId } from "mongodb";
import fs from "fs";
import path from "path";

function getStoreFilePath(): string {
  const tmpDir = process.platform === "win32" ? process.cwd() : "/tmp";
  return path.join(tmpDir, ".scrapeflow_campaigns.json");
}

function readDiskStore(): ScrapingCampaign[] {
  try {
    const p = getStoreFilePath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf-8");
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

function writeDiskStore(camps: ScrapingCampaign[]): void {
  try {
    const p = getStoreFilePath();
    fs.writeFileSync(p, JSON.stringify(camps, null, 2), "utf-8");
  } catch {}
}

export class MongoCampaignRepository {
  private collectionName = "scraping_campaigns";
  private static memoryStore: Map<string, ScrapingCampaign> = new Map();

  constructor() {
    // Populate memory store from disk cache if empty
    if (MongoCampaignRepository.memoryStore.size === 0) {
      const onDisk = readDiskStore();
      for (const c of onDisk) {
        if (c.id) MongoCampaignRepository.memoryStore.set(c.id, c);
      }
    }
  }

  private async getCollection() {
    try {
      const db = await getDatabase();
      if (!db) return null;
      return db.collection(this.collectionName);
    } catch {
      return null;
    }
  }

  async getAll(): Promise<ScrapingCampaign[]> {
    try {
      const col = await this.getCollection();
      if (col) {
        const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
        const mapped = docs.map((d) => ({ ...d, _id: d._id.toString() } as unknown as ScrapingCampaign));
        writeDiskStore(mapped);
        return mapped;
      }
    } catch {}

    const onDisk = readDiskStore();
    for (const c of onDisk) {
      if (c.id && !MongoCampaignRepository.memoryStore.has(c.id)) {
        MongoCampaignRepository.memoryStore.set(c.id, c);
      }
    }

    return Array.from(MongoCampaignRepository.memoryStore.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getById(id: string): Promise<ScrapingCampaign | null> {
    try {
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
    } catch {}

    if (MongoCampaignRepository.memoryStore.has(id)) {
      return MongoCampaignRepository.memoryStore.get(id) || null;
    }
    const onDisk = readDiskStore();
    const found = onDisk.find((c) => c.id === id || (c as any)._id === id);
    if (found && found.id) {
      MongoCampaignRepository.memoryStore.set(found.id, found);
      return found;
    }
    return null;
  }

  async create(campaign: Omit<ScrapingCampaign, "_id">): Promise<ScrapingCampaign> {
    const id = campaign.id || `camp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const record: ScrapingCampaign = {
      ...campaign,
      id,
      createdAt: campaign.createdAt || new Date().toISOString(),
      logs: campaign.logs || [],
      extractedRecords: campaign.extractedRecords || [],
    };

    try {
      const col = await this.getCollection();
      if (col) {
        const res = await col.insertOne(record as any);
        const saved = { ...record, _id: res.insertedId.toString() };
        MongoCampaignRepository.memoryStore.set(id, saved);
        writeDiskStore(Array.from(MongoCampaignRepository.memoryStore.values()));
        return saved;
      }
    } catch {}

    MongoCampaignRepository.memoryStore.set(id, record);
    writeDiskStore(Array.from(MongoCampaignRepository.memoryStore.values()));
    return record;
  }

  async update(id: string, updates: Partial<ScrapingCampaign>): Promise<ScrapingCampaign | null> {
    try {
      const col = await this.getCollection();
      if (col) {
        try {
          await col.updateOne({ id } as any, { $set: updates });
          const updated = await this.getById(id);
          if (updated) {
            MongoCampaignRepository.memoryStore.set(id, updated);
            writeDiskStore(Array.from(MongoCampaignRepository.memoryStore.values()));
            return updated;
          }
        } catch {}
      }
    } catch {}

    const existing = await this.getById(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    MongoCampaignRepository.memoryStore.set(id, updated);
    writeDiskStore(Array.from(MongoCampaignRepository.memoryStore.values()));
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    try {
      const col = await this.getCollection();
      if (col) {
        const res = await col.deleteOne({ id } as any);
        MongoCampaignRepository.memoryStore.delete(id);
        writeDiskStore(Array.from(MongoCampaignRepository.memoryStore.values()));
        return res.deletedCount > 0;
      }
    } catch {}

    const ok = MongoCampaignRepository.memoryStore.delete(id);
    writeDiskStore(Array.from(MongoCampaignRepository.memoryStore.values()));
    return ok;
  }

  async addLog(id: string, log: { level: "info" | "warn" | "error" | "success"; message: string }): Promise<void> {
    const entry = { ...log, timestamp: new Date().toISOString() };
    try {
      const col = await this.getCollection();
      if (col) {
        await col.updateOne({ id } as any, { $push: { logs: entry } as any });
      }
    } catch {}

    const camp = MongoCampaignRepository.memoryStore.get(id);
    if (camp) {
      camp.logs = camp.logs || [];
      camp.logs.push(entry);
      writeDiskStore(Array.from(MongoCampaignRepository.memoryStore.values()));
    }
  }

  async addExtractedRecords(id: string, records: Record<string, any>[]): Promise<void> {
    try {
      const col = await this.getCollection();
      if (col) {
        await col.updateOne({ id } as any, {
          $push: { extractedRecords: { $each: records } } as any,
          $inc: { successCount: records.length, processedItems: records.length } as any,
        });
      }
    } catch {}

    const camp = MongoCampaignRepository.memoryStore.get(id);
    if (camp) {
      camp.extractedRecords = camp.extractedRecords || [];
      camp.extractedRecords.push(...records);
      camp.successCount = (camp.successCount || 0) + records.length;
      camp.processedItems = (camp.processedItems || 0) + records.length;
      writeDiskStore(Array.from(MongoCampaignRepository.memoryStore.values()));
    }
  }
}

