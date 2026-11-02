import { Company } from "../core/models/Company";
import { IStorageRepository, QueryFilter } from "../core/interfaces/IStorageRepository";
import { getDatabase } from "../lib/mongodb";
import { ObjectId } from "mongodb";

export class MongoCompanyRepository implements IStorageRepository<Company> {
  private collectionName = "companies";
  // In-memory fallback if Mongo is temporarily unreachable in dev environment
  private static memoryStore: Map<string, Company> = new Map();

  private async getCollection() {
    const db = await getDatabase();
    if (!db) return null;
    return db.collection(this.collectionName);
  }

  async findById(id: string): Promise<Company | null> {
    const col = await this.getCollection();
    if (col) {
      try {
        const doc = await col.findOne({ _id: new ObjectId(id) as any });
        if (doc) return { ...doc, _id: doc._id.toString() } as unknown as Company;
      } catch {
        const doc = await col.findOne({ id } as any);
        if (doc) return doc as unknown as Company;
      }
    }
    return MongoCompanyRepository.memoryStore.get(id) || null;
  }

  async findOne(query: Record<string, any>): Promise<Company | null> {
    const col = await this.getCollection();
    if (col) {
      const doc = await col.findOne(query);
      if (doc) return { ...doc, _id: doc._id.toString() } as unknown as Company;
    }
    for (const item of MongoCompanyRepository.memoryStore.values()) {
      let match = true;
      for (const key of Object.keys(query)) {
        if ((item as any)[key] !== query[key]) match = false;
      }
      if (match) return item;
    }
    return null;
  }

  async find(filter: QueryFilter = {}): Promise<{ items: Company[]; total: number }> {
    const col = await this.getCollection();
    const query: Record<string, any> = {};

    if (filter.search) {
      query.$or = [
        { companyName: { $regex: filter.search, $options: "i" } },
        { domain: { $regex: filter.search, $options: "i" } },
        { industry: { $regex: filter.search, $options: "i" } },
      ];
    }
    if (filter.status && filter.status !== "ALL") {
      query.verificationStatus = filter.status;
    }
    if (filter.minRating) {
      query["googleMaps.rating"] = { $gte: filter.minRating };
    }
    if (filter.hasPhone) {
      query["phones.0"] = { $exists: true };
    }
    if (filter.hasEmail) {
      query["emails.0"] = { $exists: true };
    }
    if (filter.userId) {
      query.$and = (query.$and || []).concat([
        { $or: [{ userId: filter.userId }, { userId: { $exists: false } }] },
      ]);
    }

    if (col) {
      const skip = filter.skip || 0;
      const limit = filter.limit || 50;
      const sortField = filter.sortBy || "scrapedAt";
      const sortOrder = filter.sortOrder === "asc" ? 1 : -1;

      const total = await col.countDocuments(query);
      const docs = await col
        .find(query)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .toArray();

      const items = docs.map((d) => ({ ...d, _id: d._id.toString() } as unknown as Company));
      return { items, total };
    }

    // Memory Store fallback
    let all = Array.from(MongoCompanyRepository.memoryStore.values());
    if (filter.search) {
      const s = filter.search.toLowerCase();
      all = all.filter(
        (c) =>
          c.companyName.toLowerCase().includes(s) ||
          c.domain.toLowerCase().includes(s) ||
          (c.industry && c.industry.toLowerCase().includes(s))
      );
    }
    if (filter.status && filter.status !== "ALL") {
      all = all.filter((c) => c.verificationStatus === filter.status);
    }
    if (filter.minRating) {
      all = all.filter((c) => (c.googleMaps?.rating || 0) >= (filter.minRating || 0));
    }
    const total = all.length;
    const skip = filter.skip || 0;
    const limit = filter.limit || 50;
    const items = all.slice(skip, skip + limit);
    return { items, total };
  }

  async create(item: Omit<Company, "_id">): Promise<Company> {
    const col = await this.getCollection();
    const now = new Date().toISOString();
    const record: Company = {
      ...item,
      scrapedAt: item.scrapedAt || now,
    };

    if (col) {
      const res = await col.insertOne(record as any);
      return { ...record, _id: res.insertedId.toString() };
    }

    const mockId = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const saved = { ...record, _id: mockId };
    MongoCompanyRepository.memoryStore.set(mockId, saved);
    return saved;
  }

  async update(id: string, item: Partial<Company>): Promise<Company | null> {
    const col = await this.getCollection();
    if (col) {
      try {
        await col.updateOne({ _id: new ObjectId(id) as any }, { $set: item });
        return this.findById(id);
      } catch {
        await col.updateOne({ id } as any, { $set: item });
        return this.findById(id);
      }
    }
    const existing = MongoCompanyRepository.memoryStore.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...item };
    MongoCompanyRepository.memoryStore.set(id, updated);
    return updated;
  }

  async upsert(query: Record<string, any>, item: Partial<Company>): Promise<Company> {
    const existing = await this.findOne(query);
    if (existing && existing._id) {
      const updated = await this.update(existing._id, item);
      return updated || existing;
    }
    return this.create(item as Omit<Company, "_id">);
  }

  async delete(id: string): Promise<boolean> {
    const col = await this.getCollection();
    if (col) {
      try {
        const res = await col.deleteOne({ _id: new ObjectId(id) as any });
        return res.deletedCount > 0;
      } catch {
        const res = await col.deleteOne({ id } as any);
        return res.deletedCount > 0;
      }
    }
    return MongoCompanyRepository.memoryStore.delete(id);
  }

  async count(query: Record<string, any> = {}): Promise<number> {
    const col = await this.getCollection();
    if (col) {
      return col.countDocuments(query);
    }
    return MongoCompanyRepository.memoryStore.size;
  }
}

