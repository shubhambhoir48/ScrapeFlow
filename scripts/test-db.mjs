import { MongoClient } from "mongodb";
import fs from "fs";

let uri = process.env.MONGODB_URI;
if (!uri && fs.existsSync(".env.local")) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  const match = envContent.match(/MONGODB_URI=(.+)/);
  if (match) uri = match[1].trim();
}

if (!uri) {
  console.error("Error: MONGODB_URI is not set. Please set it in .env.local");
  process.exit(1);
}

const dbName = process.env.MONGODB_DB || "web_scrapper_saas";

console.log("Connecting to MongoDB Atlas...");
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
});

async function run() {
  try {
    await client.connect();
    console.log("Connected successfully to MongoDB Atlas!");
    const db = client.db(dbName);
    const pingResult = await db.command({ ping: 1 });
    console.log("Ping result:", pingResult);
    
    // Check collections
    const collections = await db.listCollections().toArray();
    console.log("Existing collections:", collections.map(c => c.name));
  } catch (err) {
    console.error("MongoDB Atlas connection error:", err.message);
  } finally {
    await client.close();
  }
}

run();

