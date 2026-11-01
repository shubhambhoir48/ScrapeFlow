import { ScrapingJob } from "../core/models/Job";
import { IStorageRepository, QueryFilter } from "../core/interfaces/IStorageRepository";
import { getDatabase } from "../lib/mongodb";
import { ObjectId } from "mongodb";

export class MongoJobRepository implements IStorageRepository<ScrapingJob> {
  private collectionName = "scraping_jobs";
  private static memoryStore: Map<string, ScrapingJob> = new Map();

  private async getCollection() {
    const db = await getDatabase();
    if (!db) return null;
    return db.collection(this.collectionName);
  }

  async findById(id: string): Promise<ScrapingJob | null> {
    const col = await this.getCollection();
    if (col) {
      try {
        const doc = await col.findOne({ _id: new ObjectId(id) as any });
        if (doc) return { ...doc, _id: doc._id.toString() } as unknown as ScrapingJob;
      } catch {
        const doc = await col.findOne({ id } as any);
        if (doc) return doc as unknown as ScrapingJob;
      }
    }
    return MongoJobRepository.memoryStore.get(id) || null;
  }

  async findOne(query: Record<string, any>): Promise<ScrapingJob | null> {
    const col = await this.getCollection();
    if (col) {
      const doc = await col.findOne(query);
      if (doc) return { ...doc, _id: doc._id.toString() } as unknown as ScrapingJob;
    }
    for (const item of MongoJobRepository.memoryStore.values()) {
      let match = true;
      for (const key of Object.keys(query)) {
        if ((item as any)[key] !== query[key]) match = false;
      }
      if (match) return item;
    }
    return null;
  }

  async find(filter: QueryFilter = {}): Promise<{ items: ScrapingJob[]; total: number }> {
    const col = await this.getCollection();
    const query: Record<string, any> = {};

    if (filter.status && filter.status !== "ALL") {
      query.status = filter.status;
    }

    if (col) {
      const skip = filter.skip || 0;
      const limit = filter.limit || 50;
      const total = await col.countDocuments(query);
      const docs = await col
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const items = docs.map((d) => ({ ...d, _id: d._id.toString() } as unknown as ScrapingJob));
      return { items, total };
    }

    let all = Array.from(MongoJobRepository.memoryStore.values());
    if (filter.status && filter.status !== "ALL") {
      all = all.filter((j) => j.status === filter.status);
    }
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = all.length;
    const skip = filter.skip || 0;
    const limit = filter.limit || 50;
    return { items: all.slice(skip, skip + limit), total };
  }

  async create(item: Omit<ScrapingJob, "_id">): Promise<ScrapingJob> {
    const col = await this.getCollection();
    const record: ScrapingJob = {
      ...item,
      id: item.id || `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: item.createdAt || new Date().toISOString(),
    };

    if (col) {
      const res = await col.insertOne(record as any);
      return { ...record, _id: res.insertedId.toString() };
    }

    MongoJobRepository.memoryStore.set(record.id, record);
    return record;
  }

  async update(id: string, item: Partial<ScrapingJob>): Promise<ScrapingJob | null> {
    const col = await this.getCollection();
    if (col) {
      try {
        await col.updateOne({ id } as any, { $set: item });
        return this.findOne({ id });
      } catch {
        // Fallback
      }
    }
    const existing = MongoJobRepository.memoryStore.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...item };
    MongoJobRepository.memoryStore.set(id, updated);
    return updated;
  }

  async upsert(query: Record<string, any>, item: Partial<ScrapingJob>): Promise<ScrapingJob> {
    const existing = await this.findOne(query);
    if (existing) {
      const updated = await this.update(existing.id, item);
      return updated || existing;
    }
    return this.create(item as Omit<ScrapingJob, "_id">);
  }

  async delete(id: string): Promise<boolean> {
    const col = await this.getCollection();
    if (col) {
      const res = await col.deleteOne({ id } as any);
      return res.deletedCount > 0;
    }
    return MongoJobRepository.memoryStore.delete(id);
  }

  async count(query: Record<string, any> = {}): Promise<number> {
    const col = await this.getCollection();
    if (col) {
      return col.countDocuments(query);
    }
    return MongoJobRepository.memoryStore.size;
  }
}

