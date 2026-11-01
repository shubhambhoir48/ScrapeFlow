const fs = require('fs');
const { MongoClient } = require('mongodb');

const envContent = fs.readFileSync('.env.local', 'utf8');
const match = envContent.match(/MONGODB_URI=(.+)/);
const uri = match ? match[1].trim() : '';

async function checkAtlas() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('web_scrapper_saas');
    const compCount = await db.collection('companies').countDocuments();
    const peopleCount = await db.collection('people').countDocuments();
    const campCount = await db.collection('campaigns').countDocuments();
    console.log(`\n=== MongoDB Atlas Central Database Real Counts ===`);
    console.log(`- Verified Companies: ${compCount}`);
    console.log(`- Key Decision Makers (People): ${peopleCount}`);
    console.log(`- Total Campaigns Logged: ${campCount}`);
  } finally {
    await client.close();
  }
}

checkAtlas().catch(console.error);
