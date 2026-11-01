const http = require('http');

async function testSocialScraper() {
  console.log('Testing Social Media Scraper POST /api/social-scraper...');
  const payload = JSON.stringify({
    targetName: "Delzad Karani",
    companyOrDomain: "Farohar Engineering pressbraketools.in"
  });

  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/social-scraper',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Social Status:', res.statusCode);
      const parsed = JSON.parse(data);
      console.log('Result:', JSON.stringify(parsed.result, null, 2));
      console.log('Logs count:', parsed.logs ? parsed.logs.length : 0);
    });
  });

  req.write(payload);
  req.end();
}

testSocialScraper();

