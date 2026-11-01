const fs = require("fs");
const { MongoClient } = require("mongodb");

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

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const cols = await db.listCollections().toArray();
  console.log(
    "Collections:",
    cols.map((c) => c.name)
  );

  for (const c of cols) {
    const count = await db.collection(c.name).countDocuments();
    console.log("Collection: " + c.name + " has " + count + " docs");
    const sample = await db.collection(c.name).find().limit(2).toArray();
    console.log("Sample:", JSON.stringify(sample, null, 2));
  }
  await client.close();
}

run().catch(console.error);

