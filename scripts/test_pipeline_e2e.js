async function testE2E() {
  console.log("=== STEP 1: Testing /api/smart-inspect on https://www.maharashtradirectory.com/ ===");
  const inspectRes = await fetch("http://localhost:3000/api/smart-inspect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: "https://www.maharashtradirectory.com/" }),
  });

  const inspectData = await inspectRes.json();
  console.log("Status:", inspectRes.status);
  console.log("Site Title:", inspectData.siteTitle);
  console.log("Site Archetype:", inspectData.siteArchetype);
  console.log("Levels Discovered:", JSON.stringify(inspectData.levelsFound, null, 2));
  console.log("De-Obfuscation Notes:", inspectData.unmaskingNotes);
  console.log("Total Discovered Fields:", inspectData.availableFields?.length);
  console.log(
    "Sample Discovered Fields:",
    inspectData.availableFields?.slice(0, 5).map((f) => ({
      name: f.name,
      sampleValue: f.sampleValue,
      unmaskingStrategy: f.unmaskingStrategy,
    }))
  );

  console.log("\n=== STEP 2: Creating a New Deep Scraping Campaign ===");
  const campRes = await fetch("http://localhost:3000/api/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Maharashtra Directory - Verified Suppliers Deep Crawl",
      type: "DIRECTORY_SCRAPER",
      targetUrls: ["https://www.maharashtradirectory.com/"],
      crawlDepth: "LEVEL_2_LISTINGS",
      paginationLimit: 2,
      selectedFieldKeys: [
        "companyName",
        "contactPerson",
        "designation",
        "phone",
        "fullAddress",
        "city",
        "products",
      ],
      stealthMode: true,
      concurrency: 3,
    }),
  });

  const campData = await campRes.json();
  console.log("Campaign Created:", campData.campaign?.id, "Status:", campData.campaign?.status);

  console.log("\n=== STEP 3: Waiting 18 seconds for Playwright Crawler to execute... ===");
  await new Promise((r) => setTimeout(r, 18000));

  const checkRes = await fetch("http://localhost:3000/api/campaigns");
  const allCampaigns = await checkRes.json();
  const myCampaign = allCampaigns.campaigns?.find((c) => c.id === campData.campaign?.id);

  console.log("\nCampaign Progress:", myCampaign?.progress + "%", "Status:", myCampaign?.status);
  console.log("Total Extracted Records:", myCampaign?.extractedRecords?.length);
  console.log("Sample Extracted Records:\n", JSON.stringify(myCampaign?.extractedRecords?.slice(0, 3), null, 2));
  console.log("\nExecution Logs Sample:\n", myCampaign?.logs?.slice(-6));
}

testE2E().catch(console.error);

