const http = require('http');

async function testLiveCampaign() {
  console.log('Testing live campaign creation via POST /api/campaigns...');
  
  const payload = JSON.stringify({
    name: "Maharashtra Directory - Live Enterprise Verification",
    type: "DIRECTORY_SCRAPER",
    targetUrls: ["https://www.maharashtradirectory.com/"],
    engine: "PLAYWRIGHT_STEALTH",
    stealthMode: true,
    concurrency: 2,
    crawlDepth: "LEVEL_2_LISTINGS",
    paginationLimit: 3,
    targetQuota: 25,
    selectedFieldKeys: ["companyName", "contactPerson", "designation", "phone", "email", "address", "products", "website"],
  });

  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/campaigns',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', async () => {
      console.log('Create campaign status:', res.statusCode);
      const parsed = JSON.parse(data);
      console.log('Created campaign ID:', parsed.campaign?.id);
      
      const campaignId = parsed.campaign?.id;
      if (!campaignId) {
        console.error('No campaign ID returned!');
        return;
      }
      
      console.log('\nPolling campaign progress in background...');
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 3000));
        
        http.get('http://localhost:3000/api/campaigns', (cRes) => {
          let cData = '';
          cRes.on('data', chunk => cData += chunk);
          cRes.on('end', () => {
            const allC = JSON.parse(cData).campaigns || [];
            const thisC = allC.find(c => c.id === campaignId);
            if (thisC) {
              const recCount = thisC.extractedRecords?.length || thisC.successCount || 0;
              const lastLog = thisC.logs?.[thisC.logs.length - 1]?.message || '';
              console.log(`[T+${(i+1)*3}s] Status: ${thisC.status} | Progress: ${thisC.progress}% | Extracted: ${recCount} | Last Log: ${lastLog.slice(0, 70)}`);
              
              if (thisC.status === 'COMPLETED' || recCount >= 20) {
                console.log('\n--- Live Campaign Verification SUCCESSFUL ---');
                console.log(`Final records harvested: ${recCount}`);
                if (thisC.extractedRecords && thisC.extractedRecords.length > 0) {
                  console.log('Sample record 1:', JSON.stringify(thisC.extractedRecords[0], null, 2));
                  if (thisC.extractedRecords[1]) {
                    console.log('Sample record 2:', JSON.stringify(thisC.extractedRecords[1], null, 2));
                  }
                }
                process.exit(0);
              }
            }
          });
        });
      }
    });
  });

  req.on('error', (e) => {
    console.error('Request error:', e);
  });

  req.write(payload);
  req.end();
}

testLiveCampaign().catch(console.error);

