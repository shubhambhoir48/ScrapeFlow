const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

async function testMonsterFlow() {
  console.log("=== STEP 1: Launching Monster Scraping Campaign ===");
  const campRes = await fetch("http://localhost:3000/api/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Maharashtra Directory Enterprise Crawl",
      type: "DIRECTORY_SCRAPER",
      targetUrls: ["https://www.maharashtradirectory.com/"],
      crawlDepth: "LEVEL_2_LISTINGS",
      paginationLimit: 3,
      selectedFieldKeys: [
        "companyName",
        "contactPerson",
        "designation",
        "fullAddress",
        "city",
        "phone",
        "email",
        "products",
      ],
      stealthMode: true,
      concurrency: 4,
    }),
  });

  const campData = await campRes.json();
  const campId = campData.campaign?.id;
  console.log("Campaign created with ID:", campId, "Status:", campData.campaign?.status);

  if (!campId) {
    console.error("Failed to create campaign:", campData);
    return;
  }

  console.log("\n=== STEP 2: Polling Campaign Progress until Completion ===");
  let finished = false;
  let attempts = 0;
  while (!finished && attempts < 40) {
    await new Promise((r) => setTimeout(r, 3000));
    attempts++;
    const statusRes = await fetch("http://localhost:3000/api/campaigns");
    const statusData = await statusRes.json();
    const c = statusData.campaigns?.find((x) => x.id === campId);
    if (!c) {
      console.log(`[Attempt ${attempts}] Campaign not found in list yet...`);
      continue;
    }
    const logCount = c.logs?.length || 0;
    const latestLog = logCount > 0 ? c.logs[logCount - 1].message : "No logs yet";
    console.log(`[Attempt ${attempts}] Progress: ${c.progress}% | Status: ${c.status} | Extracted: ${c.extractedRecords?.length || 0} items | Log: ${latestLog.slice(0, 90)}`);

    if (c.status === "COMPLETED" || c.status === "FAILED") {
      finished = true;
    }
  }

  console.log("\n=== STEP 3: Checking Central Database (Data Explorer) in MongoDB Atlas ===");
  const compRes = await fetch("http://localhost:3000/api/companies");
  const compData = await compRes.json();
  console.log(`Total Companies in Central Database: ${compData.total}`);
  console.log(
    "Sample Companies in MongoDB Atlas:\n",
    JSON.stringify(
      compData.items?.slice(0, 5).map((c) => ({
        id: c._id,
        name: c.companyName,
        contactPerson: c.contactPerson,
        designation: c.designation,
        phone: c.phones?.[0]?.number || "Pending Enrichment",
        enrichmentStatus: c.enrichmentStatus,
        address: c.addresses?.[0]?.fullAddress,
      })),
      null,
      2
    )
  );

  const peopleRes = await fetch("http://localhost:3000/api/people");
  const peopleData = await peopleRes.json();
  console.log(`\nTotal Decision Makers in Central Database: ${peopleData.total}`);
  console.log(
    "Sample Decision Makers:\n",
    JSON.stringify(
      peopleData.items?.slice(0, 5).map((p) => ({
        name: p.fullName,
        designation: p.designation,
        seniority: p.seniority,
        company: p.organizationName,
      })),
      null,
      2
    )
  );

  // STEP 4: Test Autonomous Cascade Enrichment
  const pendingCompany = compData.items?.find((c) => c.enrichmentStatus === "PENDING" || !c.phones?.[0]?.number);
  if (pendingCompany && pendingCompany._id) {
    console.log(`\n=== STEP 4: Triggering Cascade Enrichment on ${pendingCompany.companyName} (${pendingCompany._id}) ===`);
    const enrichRes = await fetch("http://localhost:3000/api/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: pendingCompany._id }),
    });

    const enrichData = await enrichRes.json();
    console.log("Enrichment Result:", enrichData);

    // Re-fetch company
    const updatedRes = await fetch("http://localhost:3000/api/companies");
    const updatedData = await updatedRes.json();
    const updatedCompany = updatedData.items?.find((c) => c._id === pendingCompany._id);

    console.log("\n=== VERIFIED UNMASKED COMPANY AFTER CASCADE ENRICHMENT ===");
    console.log("Company:", updatedCompany?.companyName);
    console.log("Unmasked Phone Numbers:", updatedCompany?.phones);
    console.log("Corporate Emails:", updatedCompany?.emails);
    console.log("Official Website:", updatedCompany?.websiteUrl);
    console.log("Google Maps Rating:", updatedCompany?.googleMaps?.rating);
    console.log("Enrichment Status:", updatedCompany?.enrichmentStatus);
    console.log("Sources Consulted:", updatedCompany?.enrichmentSources);
  }
}

testMonsterFlow().catch(console.error);
