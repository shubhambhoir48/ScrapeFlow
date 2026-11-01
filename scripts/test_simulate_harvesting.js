const cheerio = require('cheerio');
const https = require('https');

function fastFetch(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

async function simulateHarvesting(seedUrl, targetQuota = 50) {
  console.log(`Starting simulated deep crawl for ${seedUrl} with quota: ${targetQuota}...`);
  const queue = [];
  const records = [];
  
  // 1. Visit root seed
  const rootHtml = await fastFetch(seedUrl);
  const $root = cheerio.load(rootHtml);
  
  // Find category index or category links
  let categoryIndexUrl = null;
  $root('a[href]').each((_, el) => {
    const h = $root(el).attr('href') || '';
    if (h.toLowerCase().includes('/category') || h.toLowerCase().includes('/categories') || h.toLowerCase().includes('/catalog')) {
      const full = h.startsWith('http') ? h : new URL(h, seedUrl).toString();
      if (!categoryIndexUrl && full.endsWith('/Category')) categoryIndexUrl = full;
    }
  });
  
  if (categoryIndexUrl) {
    console.log(`Discovered Category Index: ${categoryIndexUrl}. Fetching master categories...`);
    const catHtml = await fastFetch(categoryIndexUrl);
    const $cat = cheerio.load(catHtml);
    
    const subcats = [];
    $cat('a[href*="/category/"]').each((_, el) => {
      const h = $cat(el).attr('href');
      if (h && h.endsWith('.html')) {
        const full = h.startsWith('http') ? h : new URL(h, categoryIndexUrl).toString();
        if (!subcats.includes(full)) subcats.push(full);
      }
    });
    console.log(`Discovered ${subcats.length} subcategories across directory.`);
    
    // Harvest products from subcategories
    for (const sub of subcats.slice(0, 5)) {
      const subHtml = await fastFetch(sub);
      const $sub = cheerio.load(subHtml);
      $sub('a[href*="/product/"]').each((_, el) => {
        const h = $sub(el).attr('href');
        if (h && h.endsWith('.html') && !h.includes('/alpha/')) {
          const full = h.startsWith('http') ? h : new URL(h, sub).toString();
          if (!queue.includes(full)) queue.push(full);
        }
      });
      if (queue.length >= 40) break;
    }
  }
  
  // If queue still small, sample alphabetical index
  if (queue.length < 20) {
    for (const letter of ['M', 'P', 'C', 'A', 'S']) {
      const alphaUrl = `https://www.maharashtradirectory.com/product/alpha/${letter}.html`;
      const aHtml = await fastFetch(alphaUrl);
      const $a = cheerio.load(aHtml);
      $a('a[href*="/product/"]').each((_, el) => {
        const h = $a(el).attr('href');
        if (h && h.endsWith('.html') && !h.includes('/alpha/')) {
          const full = h.startsWith('http') ? h : new URL(h, alphaUrl).toString();
          if (!queue.includes(full)) queue.push(full);
        }
      });
      if (queue.length >= 60) break;
    }
  }
  
  console.log(`Queued ${queue.length} product listing pathways. Starting card extraction...`);
  
  for (let i = 0; i < queue.length; i++) {
    if (records.length >= targetQuota) break;
    const prodUrl = queue[i];
    const pHtml = await fastFetch(prodUrl);
    const $p = cheerio.load(pHtml);
    
    let addedOnThisPage = 0;
    $p('.rc-body').each((_, el) => {
      if (records.length >= targetQuota) return;
      const card = $p(el);
      const titleLink = card.find('.rc-title a');
      const companyName = titleLink.text().trim();
      const contactTitle = titleLink.attr('title') || '';
      
      if (companyName && !records.some(r => r.companyName.toLowerCase() === companyName.toLowerCase())) {
        records.push({
          companyName,
          contactPerson: contactTitle.replace(/^Contact:\s*/i, '').split('/')[0].trim(),
          product: prodUrl.split('/').pop(),
        });
        addedOnThisPage++;
      }
    });
    
    // Check pagination
    if (records.length < targetQuota) {
      $p('.pagination a, a[href*="page="]').each((_, el) => {
        const h = $p(el).attr('href');
        if (h) {
          const full = h.startsWith('http') ? h : new URL(h, prodUrl).toString();
          if (!queue.includes(full)) queue.push(full);
        }
      });
    }
    
    console.log(`[Pathway ${i+1}/${queue.length}] Extracted ${addedOnThisPage} from ${prodUrl.split('/').pop()} (Total: ${records.length}/${targetQuota})`);
  }
  
  console.log(`\nHarvested total records: ${records.length}`);
  console.log('Sample 3 records:', records.slice(0, 3));
}

simulateHarvesting('https://www.maharashtradirectory.com/', 50).catch(console.error);

