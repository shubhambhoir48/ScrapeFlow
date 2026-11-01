const https = require('https');

https.get('https://www.maharashtradirectory.com/Category', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Category page status:', res.statusCode, 'length:', data.length);
    const hrefs = [];
    const re = /href=["']([^"']+)["']/gi;
    let match;
    while ((match = re.exec(data)) !== null) {
      const h = match[1];
      if (h.includes('/product/') || h.includes('/category/') || h.includes('/alpha/')) {
        hrefs.push(h);
      }
    }
    console.log('Total product/category/alpha links on /Category:', hrefs.length);
    console.log('Sample:', hrefs.slice(0, 15));
  });
}).on('error', (e) => console.error(e));

