async function testApi() {
  const payload = {
    organizations: ["Mahratta Chamber of Commerce, Industries and Agriculture (MCCIA)"],
    config: {
      extractPeople: true,
      maxPeoplePerOrg: 100,
      extractEmails: true,
      extractPhones: true,
      extractSocial: true,
      extractOrgDetails: true,
      extractGoogleMaps: true,
      depth: "COMPREHENSIVE_ABM",
    },
  };

  console.log("Submitting Omni-Channel Scrape Campaign...");
  const postRes = await fetch("http://localhost:3000/api/omni-scraper", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const postData = await postRes.json();
  console.log("Response:", postData);
  const campId = postData.campaign?.id;

  // Wait 3 seconds for background worker to populate data
  await new Promise((r) => setTimeout(r, 3500));

  const getRes = await fetch(`http://localhost:3000/api/omni-scraper?id=${campId}`);
  const getData = await getRes.json();
  const camp = getData.campaign;

  console.log("\n=== Campaign Live Status ===");
  console.log(`Campaign Name: ${camp.name}`);
  console.log(`Status: ${camp.status} (${camp.progress}%)`);
  console.log(`Dossiers Extracted: ${camp.dossiers?.length}`);

  if (camp.dossiers?.length > 0) {
    const d = camp.dossiers[0];
    console.log(`Organization: ${d.organizationName}`);
    console.log(`Domain: ${d.domain}`);
    console.log(`Total Leaders & Members: ${d.people?.length}`);
    console.log(`Stats:`, d.stats);
    console.log(`Social Handles:`, d.socialLinks);
    console.log("\nSample 5 Directors:");
    d.people?.slice(0, 5).forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.fullName} - ${p.designation} (${p.seniority})`);
      console.log(`     Email: ${p.workEmail} | Phone: ${p.mobilePhone || p.phone} | WA: ${p.whatsapp}`);
    });
  }
}

testApi().catch(console.error);

