async function testGmapsCampaign() {
  console.log("=== STEP 1: Launching Google Maps Scraping Campaign ===");
  const campRes = await fetch("http://localhost:3000/api/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Thane CNC Machining Google Maps Crawl",
      type: "GOOGLE_MAPS",
      mapsQuery: "CNC Machining Companies",
      mapsCategory: "Manufacturer",
      mapsCity: "Thane",
      mapsState: "Maharashtra",
      mapsCountry: "India",
      mapsLimit: 10,
      mustHavePhone: false,
    }),
  });

  const campData = await campRes.json();
  const campId = campData.campaign?.id;
  console.log("Created Google Maps Campaign:", campId, "Status:", campData.campaign?.status);

  if (!campId) {
    console.error("Failed to create campaign:", campData);
    return;
  }

  console.log("\n=== STEP 2: Polling Campaign Progress until Completion ===");
  let finished = false;
  let attempts = 0;
  while (!finished && attempts < 35) {
    await new Promise((r) => setTimeout(r, 3000));
    attempts++;
    const statusRes = await fetch("http://localhost:3000/api/campaigns");
    const statusData = await statusRes.json();
    const c = statusData.campaigns?.find((x) => x.id === campId);
    if (!c) continue;

    const logCount = c.logs?.length || 0;
    const latestLog = logCount > 0 ? c.logs[logCount - 1].message : "No logs yet";
    console.log(`[Attempt ${attempts}] Progress: ${c.progress}% | Status: ${c.status} | Extracted: ${c.extractedRecords?.length || 0} places | Log: ${latestLog.slice(0, 90)}`);

    if (c.status === "COMPLETED" || c.status === "FAILED") {
      finished = true;
    }
  }

  console.log("\n=== STEP 3: Verifying Stored Google Maps Places in MongoDB Central Database ===");
  const compRes = await fetch("http://localhost:3000/api/companies?limit=15");
  const compData = await compRes.json();
  console.log(`Total Companies in MongoDB Atlas: ${compData.total}`);

  const gmapsCompanies = (compData.items || []).filter((c) => c.googleMaps?.rating !== undefined || c.googleMaps?.placeUrl);
  console.log(`Google Maps Companies in Database: ${gmapsCompanies.length}`);
  console.log(
    "Sample Extracted Places:\n",
    JSON.stringify(
      gmapsCompanies.slice(0, 5).map((c) => ({
        name: c.companyName,
        category: c.industry,
        rating: c.googleMaps?.rating,
        reviews: c.googleMaps?.reviewCount,
        phone: c.phones?.[0]?.number || "No phone",
        website: c.websiteUrl,
        address: c.addresses?.[0]?.fullAddress,
      })),
      null,
      2
    )
  );
}

testGmapsCampaign().catch(console.error);

