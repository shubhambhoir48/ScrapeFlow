const { OmniChannelScraperEngine } = require("../src/services/scrapers/OmniChannelScraperEngine");

async function main() {
  console.log("=== Testing Omni-Channel Harvester on MCCIA ===");
  const engine = new OmniChannelScraperEngine();

  const dossier = await engine.harvestOrganization(
    "Mahratta Chamber of Commerce, Industries and Agriculture (MCCIA)",
    {
      extractPeople: true,
      targetSeniorities: ["CHAIRMAN", "DIRECTOR", "BOARD_MEMBER", "C_SUITE", "VP", "HEAD_OF_DEPT", "MANAGER", "GENERAL"],
      targetDepartments: ["EXECUTIVE", "ENGINEERING", "MARKETING", "SALES", "OPERATIONS", "HUMAN_RESOURCES", "FINANCE"],
      maxPeoplePerOrg: 100,
      extractEmails: true,
      extractPhones: true,
      extractSocial: true,
      extractOrgDetails: true,
      extractGoogleMaps: true,
      depth: "COMPREHENSIVE_ABM",
    },
    async (log) => {
      console.log(`[${log.level.toUpperCase()}] ${log.message}`);
    }
  );

  console.log("\n=== DOSSIER EXTRACTED SUCCESSFULLY ===");
  console.log(`Organization: ${dossier.organizationName}`);
  console.log(`Domain: ${dossier.domain}`);
  console.log(`Website: ${dossier.website}`);
  console.log(`Total Leaders & Team Members: ${dossier.people.length}`);
  console.log(`Directors & Board: ${dossier.stats.directorsCount}`);
  console.log(`C-Suite & Executives: ${dossier.stats.executivesCount}`);
  console.log(`Team & Secretariat: ${dossier.stats.teamMembersCount}`);
  console.log(`Verified Phone Numbers: ${dossier.stats.phoneCount}`);
  console.log(`Verified Corporate Emails: ${dossier.stats.verifiedEmailsCount}`);
  console.log(`Official Social Handles:`, dossier.socialLinks);

  console.log("\nSample 5 Directors:");
  dossier.people.slice(0, 5).forEach((p, idx) => {
    console.log(`  ${idx + 1}. ${p.fullName} - ${p.designation} (${p.seniority})`);
    console.log(`     Email: ${p.workEmail} | Phone: ${p.mobilePhone || p.phone} | WA: ${p.whatsapp}`);
  });
}

main().catch(console.error);

