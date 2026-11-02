import { UserProfile, UserRole } from "../core/models/User";
import { getDatabase } from "../lib/mongodb";
import fs from "fs";
import path from "path";

function getUserStorePath(): string {
  const tmpDir = process.platform === "win32" ? process.cwd() : "/tmp";
  return path.join(tmpDir, ".scrapeflow_users.json");
}

function readUsersDisk(): UserProfile[] {
  try {
    const p = getUserStorePath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf-8");
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

function writeUsersDisk(users: UserProfile[]): void {
  try {
    const p = getUserStorePath();
    fs.writeFileSync(p, JSON.stringify(users, null, 2), "utf-8");
  } catch {}
}

const SUPER_ADMIN_EMAILS = [
  "shubhambhoir4895@gmail.com",
  "bhoirshubham45@gmail.com",
];

export class MongoUserRepository {
  private collectionName = "users";
  private static memoryStore: Map<string, UserProfile> = new Map();

  constructor() {
    if (MongoUserRepository.memoryStore.size === 0) {
      const onDisk = readUsersDisk();
      for (const u of onDisk) {
        if (u.uid) MongoUserRepository.memoryStore.set(u.uid, u);
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

  async upsertUser(data: {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
  }): Promise<UserProfile> {
    const emailLower = data.email.toLowerCase().trim();
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(emailLower);
    const role: UserRole = isSuperAdmin ? "SUPER_ADMIN" : "MEMBER";
    const plan = isSuperAdmin ? "ENTERPRISE" : "PRO";

    const existing = await this.findByUid(data.uid);
    const now = new Date().toISOString();

    const profile: UserProfile = {
      uid: data.uid,
      email: emailLower,
      displayName: data.displayName || data.email.split("@")[0] || "Operator",
      photoURL: data.photoURL,
      role: existing?.role || role,
      plan: existing?.plan || plan,
      organizationId: existing?.organizationId || `org_${data.uid}`,
      createdAt: existing?.createdAt || now,
      lastLoginAt: now,
    };

    try {
      const col = await this.getCollection();
      if (col) {
        await col.updateOne(
          { uid: data.uid },
          { $set: profile },
          { upsert: true }
        );
      }
    } catch {}

    MongoUserRepository.memoryStore.set(data.uid, profile);
    writeUsersDisk(Array.from(MongoUserRepository.memoryStore.values()));

    return profile;
  }

  async findByUid(uid: string): Promise<UserProfile | null> {
    try {
      const col = await this.getCollection();
      if (col) {
        const doc = await col.findOne({ uid });
        if (doc) return doc as unknown as UserProfile;
      }
    } catch {}

    if (MongoUserRepository.memoryStore.has(uid)) {
      return MongoUserRepository.memoryStore.get(uid) || null;
    }

    const onDisk = readUsersDisk();
    const found = onDisk.find((u) => u.uid === uid);
    if (found) {
      MongoUserRepository.memoryStore.set(uid, found);
      return found;
    }

    return null;
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    const emailLower = email.toLowerCase().trim();
    try {
      const col = await this.getCollection();
      if (col) {
        const doc = await col.findOne({ email: emailLower });
        if (doc) return doc as unknown as UserProfile;
      }
    } catch {}

    const onDisk = readUsersDisk();
    const found = onDisk.find((u) => u.email.toLowerCase() === emailLower);
    return found || null;
  }

  async getAllUsers(): Promise<UserProfile[]> {
    try {
      const col = await this.getCollection();
      if (col) {
        const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
        const mapped = docs.map((d) => d as unknown as UserProfile);
        writeUsersDisk(mapped);
        return mapped;
      }
    } catch {}

    const onDisk = readUsersDisk();
    return onDisk.length > 0 ? onDisk : Array.from(MongoUserRepository.memoryStore.values());
  }
}

