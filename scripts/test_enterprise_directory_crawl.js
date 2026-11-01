const cheerio = require('cheerio');
const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function runTest() {
  console.log('Testing Fast Deep Directory Crawl on Maharashtra Directory...');
  
  // Step 1: Fetch Category Index
  const catRes = await fetchUrl('https://www.maharashtradirectory.com/Category');
  console.log('Category page fetched. Status:', catRes.statusCode);
  const $cat = cheerio.load(catRes.data);
  
  const subcatUrls = [];
  $cat('a[href*="/category/"]').each((_, el) => {
    const h = $cat(el).attr('href');
    if (h && h.endsWith('.html')) {
      const full = h.startsWith('http') ? h : `https://www.maharashtradirectory.com${h}`;
      if (!subcatUrls.includes(full)) subcatUrls.push(full);
    }
  });
  console.log('Discovered subcategory URLs:', subcatUrls.length);
  
  // Step 2: From first 2 subcategories, harvest product listing URLs
  const productUrls = [];
  for (const subcat of subcatUrls.slice(0, 3)) {
    const subRes = await fetchUrl(subcat);
    const $sub = cheerio.load(subRes.data);
    $sub('a[href*="/product/"]').each((_, el) => {
      const h = $sub(el).attr('href');
      if (h && h.endsWith('.html') && !h.includes('/alpha/')) {
        const full = h.startsWith('http') ? h : `https://www.maharashtradirectory.com${h}`;
        if (!productUrls.includes(full)) productUrls.push(full);
      }
    });
    console.log(`Subcategory ${subcat.split('/').pop()} yielded total products:`, productUrls.length);
    if (productUrls.length >= 20) break;
  }
  
  // Step 3: Crawl product pages and paginate to extract companies
  const companies = [];
  for (const prodUrl of productUrls.slice(0, 5)) {
    console.log(`Crawling product: ${prodUrl}`);
    const prodRes = await fetchUrl(prodUrl);
    const $p = cheerio.load(prodRes.data);
    
    $p('.rc-body').each((_, el) => {
      const card = $p(el);
      const titleLink = card.find('.rc-title a');
      const companyName = titleLink.text().trim();
      const contactTitle = titleLink.attr('title') || '';
      const address = card.text().split('\n').map(l => l.trim()).find(l => l.match(/(?:Mumbai|Pune|Thane|Nashik|Maharashtra|\d{6})/i) && !l.includes('Tel')) || '';
      
      if (companyName && !companies.some(c => c.companyName === companyName)) {
        companies.push({ companyName, contactTitle, address, product: prodUrl.split('/').pop() });
      }
    });
    
    console.log(`Total companies extracted so far: ${companies.length}`);
    if (companies.length >= 30) break;
  }
  
  console.log('\n--- Extraction Complete ---');
  console.log('Total verified companies harvested:', companies.length);
  console.log('First 5 harvested companies:');
  console.log(companies.slice(0, 5));
}

runTest().catch(console.error);

