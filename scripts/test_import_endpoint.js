const http = require('http');

async function testImport() {
  const payload = JSON.stringify({
    type: "ORGANIZATIONS",
    listName: "Precision CNC Leads",
    records: [
      {
        "Company Name": "Apex Precision Engineering Works",
        "Domain": "apexprecision.co.in",
        "Contact Person": "Mr. Rajesh Kulkarni",
        "Designation": "Managing Director",
        "Phone": "+91 9823019876",
        "Email": "info@apexprecision.co.in",
        "Address": "Plot C-12, MIDC Bhosari, Pune, Maharashtra",
        "City": "Pune"
      },
      {
        "Company Name": "Zenith Hydraulics & Pneumatics",
        "Domain": "zenithhydraulics.com",
        "Contact Person": "Mr. Amit Deshmukh",
        "Designation": "Partner",
        "Phone": "+91 9890123456",
        "Email": "sales@zenithhydraulics.com",
        "Address": "Gala No 5, Wagle Estate, Thane, Maharashtra",
        "City": "Thane"
      }
    ]
  });

  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/import',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Import Status:', res.statusCode);
      console.log('Import Response:', data);
    });
  });

  req.write(payload);
  req.end();
}

testImport();

