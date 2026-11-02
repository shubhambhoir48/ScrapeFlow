import { MongoClient, Db } from "mongodb";
import dns from "dns";

// Ensure reliable SRV DNS resolution for MongoDB Atlas across Windows / ISP networks
try {
  if (typeof process !== "undefined" && process.platform === "win32") {
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
  }
} catch {
  // Ignore in sandboxed runtimes
}

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "scrapeflow";

interface MongoGlobal {
  _mongoClientPromise?: Promise<MongoClient>;
}

declare const global: MongoGlobal & typeof globalThis;

let clientPromise: Promise<MongoClient> | null = null;
let isConnected = false;

// Fast-fail timeouts ensure serverless functions never hang or trigger Vercel 504 timeouts
const MONGO_OPTIONS = {
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 2500,
  connectTimeoutMS: 2500,
};

export async function getMongoClient(): Promise<MongoClient | null> {
  if (!MONGODB_URI) {
    return null;
  }

  try {
    if (process.env.NODE_ENV === "development") {
      // In development mode, use a global variable to preserve the client across module reloads
      if (!global._mongoClientPromise) {
        const client = new MongoClient(MONGODB_URI, MONGO_OPTIONS);
        global._mongoClientPromise = client.connect();
      }
      const client = await global._mongoClientPromise;
      isConnected = true;
      return client;
    } else {
      if (!clientPromise) {
        const client = new MongoClient(MONGODB_URI, MONGO_OPTIONS);
        clientPromise = client.connect();
      }
      const client = await clientPromise;
      isConnected = true;
      return client;
    }
  } catch (error: any) {
    console.error("MongoDB Atlas connection attempt failed:", error.message);
    clientPromise = null;
    if (global._mongoClientPromise) {
      delete global._mongoClientPromise;
    }
    isConnected = false;
    return null;
  }
}

export async function getDatabase(): Promise<Db | null> {
  try {
    const client = await getMongoClient();
    if (!client) return null;
    return client.db(MONGODB_DB);
  } catch {
    return null;
  }
}

export function isMongoConnected(): boolean {
  return isConnected;
}

export async function testMongoConnection(): Promise<{
  connected: boolean;
  database?: string;
  cluster?: string;
  error?: string;
}> {
  if (!MONGODB_URI) {
    return {
      connected: false,
      error: "MONGODB_URI is not set in environment. Please configure .env.local",
    };
  }

  try {
    const client = await getMongoClient();
    if (!client) {
      return {
        connected: false,
        error: "Could not establish connection to MongoDB Atlas. Check network access / IP whitelist.",
      };
    }
    const db = client.db(MONGODB_DB);
    await db.command({ ping: 1 });

    let clusterDisplay = "MongoDB Atlas Cluster";
    try {
      const parsed = new URL(MONGODB_URI.replace(/^mongodb\+srv:\/\//, "http://").replace(/^mongodb:\/\//, "http://"));
      clusterDisplay = parsed.hostname || "MongoDB Atlas";
    } catch {}

    return {
      connected: true,
      database: MONGODB_DB,
      cluster: clusterDisplay,
    };
  } catch (error: any) {
    return {
      connected: false,
      error: error.message,
    };
  }
}
