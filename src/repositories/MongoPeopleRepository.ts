import { Person, SeniorityLevel, Department } from "../core/models/Person";
import { IStorageRepository, QueryFilter } from "../core/interfaces/IStorageRepository";
import { getDatabase } from "../lib/mongodb";
import { ObjectId } from "mongodb";

export interface PeopleQueryFilter extends QueryFilter {
  seniority?: SeniorityLevel | "ALL";
  department?: Department | "ALL";
  organizationDomain?: string;
  hasWhatsapp?: boolean;
  hasLinkedin?: boolean;
}

export class MongoPeopleRepository implements IStorageRepository<Person> {
  private collectionName = "people";
  private static memoryStore: Map<string, Person> = new Map();

  private async getCollection() {
    const db = await getDatabase();
    if (!db) return null;
    return db.collection(this.collectionName);
  }

  async findById(id: string): Promise<Person | null> {
    const col = await this.getCollection();
    if (col) {
      try {
        const doc = await col.findOne({ _id: new ObjectId(id) as any });
        if (doc) return { ...doc, _id: doc._id.toString() } as unknown as Person;
      } catch {
        const doc = await col.findOne({ id } as any);
        if (doc) return doc as unknown as Person;
      }
    }
    return MongoPeopleRepository.memoryStore.get(id) || null;
  }

  async findOne(query: Record<string, any>): Promise<Person | null> {
    const col = await this.getCollection();
    if (col) {
      const doc = await col.findOne(query);
      if (doc) return { ...doc, _id: doc._id.toString() } as unknown as Person;
    }
    for (const item of MongoPeopleRepository.memoryStore.values()) {
      let match = true;
      for (const key of Object.keys(query)) {
        if ((item as any)[key] !== query[key]) match = false;
      }
      if (match) return item;
    }
    return null;
  }

  async find(filter: PeopleQueryFilter = {}): Promise<{ items: Person[]; total: number }> {
    const col = await this.getCollection();
    const query: Record<string, any> = {};

    if (filter.search) {
      query.$or = [
        { fullName: { $regex: filter.search, $options: "i" } },
        { designation: { $regex: filter.search, $options: "i" } },
        { organizationName: { $regex: filter.search, $options: "i" } },
        { organizationDomain: { $regex: filter.search, $options: "i" } },
        { "location.city": { $regex: filter.search, $options: "i" } },
      ];
    }
    if (filter.status && filter.status !== "ALL") {
      query.verificationStatus = filter.status;
    }
    if (filter.seniority && filter.seniority !== "ALL") {
      query.seniority = filter.seniority;
    }
    if (filter.department && filter.department !== "ALL") {
      query.department = filter.department;
    }
    if (filter.organizationDomain) {
      query.organizationDomain = filter.organizationDomain;
    }
    if (filter.hasEmail) {
      query.$or = [
        { workEmail: { $exists: true, $ne: "" } },
        { personalEmail: { $exists: true, $ne: "" } },
      ];
    }
    if (filter.hasPhone) {
      query.phone = { $exists: true, $ne: "" };
    }
    if (filter.hasWhatsapp) {
      query.whatsappAvailable = true;
    }
    if (filter.hasLinkedin) {
      query.linkedinUrl = { $exists: true, $ne: "" };
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

      const items = docs.map((d) => ({ ...d, _id: d._id.toString() } as unknown as Person));
      return { items, total };
    }

    // Memory Store fallback
    let all = Array.from(MongoPeopleRepository.memoryStore.values());
    if (filter.search) {
      const s = filter.search.toLowerCase();
      all = all.filter(
        (p) =>
          p.fullName.toLowerCase().includes(s) ||
          p.designation.toLowerCase().includes(s) ||
          p.organizationName.toLowerCase().includes(s) ||
          p.organizationDomain.toLowerCase().includes(s)
      );
    }
    if (filter.status && filter.status !== "ALL") {
      all = all.filter((p) => p.verificationStatus === filter.status);
    }
    if (filter.seniority && filter.seniority !== "ALL") {
      all = all.filter((p) => p.seniority === filter.seniority);
    }
    if (filter.department && filter.department !== "ALL") {
      all = all.filter((p) => p.department === filter.department);
    }
    if (filter.hasEmail) {
      all = all.filter((p) => Boolean(p.workEmail || p.personalEmail));
    }
    if (filter.hasPhone) {
      all = all.filter((p) => Boolean(p.phone || p.mobilePhone));
    }
    if (filter.hasWhatsapp) {
      all = all.filter((p) => p.whatsappAvailable);
    }
    if (filter.hasLinkedin) {
      all = all.filter((p) => Boolean(p.linkedinUrl));
    }

    const total = all.length;
    const skip = filter.skip || 0;
    const limit = filter.limit || 50;
    const items = all.slice(skip, skip + limit);
    return { items, total };
  }

  async create(item: Omit<Person, "_id">): Promise<Person> {
    const col = await this.getCollection();
    const now = new Date().toISOString();
    const record: Person = {
      ...item,
      scrapedAt: item.scrapedAt || now,
    };

    if (col) {
      const res = await col.insertOne(record as any);
      return { ...record, _id: res.insertedId.toString() };
    }

    const mockId = `person_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const saved = { ...record, _id: mockId };
    MongoPeopleRepository.memoryStore.set(mockId, saved);
    return saved;
  }

  async update(id: string, item: Partial<Person>): Promise<Person | null> {
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
    const existing = MongoPeopleRepository.memoryStore.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...item };
    MongoPeopleRepository.memoryStore.set(id, updated);
    return updated;
  }

  async upsert(query: Record<string, any>, item: Partial<Person>): Promise<Person> {
    const existing = await this.findOne(query);
    if (existing && existing._id) {
      const updated = await this.update(existing._id, item);
      return updated || existing;
    }
    return this.create(item as Omit<Person, "_id">);
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
    return MongoPeopleRepository.memoryStore.delete(id);
  }

  async count(query: Record<string, any> = {}): Promise<number> {
    const col = await this.getCollection();
    if (col) {
      return col.countDocuments(query);
    }
    return MongoPeopleRepository.memoryStore.size;
  }
}

