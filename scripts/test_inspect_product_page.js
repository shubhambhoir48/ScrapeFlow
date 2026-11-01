const https = require('https');
const cheerio = require('cheerio');

https.get('https://www.maharashtradirectory.com/product/air-compressors.html', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode, 'Length:', data.length);
    const $ = cheerio.load(data);
    const cards = $('.rc-body');
    console.log('rc-body cards count:', cards.length);
    cards.each((i, el) => {
      const titleLink = $(el).find('.rc-title a');
      const compName = titleLink.text().trim();
      const contact = titleLink.attr('title');
      const compInfo = titleLink.attr('href');
      console.log(`[${i+1}] Comp: ${compName} | Contact: ${contact} | Info: ${compInfo}`);
    });
    
    // Check pagination
    const pagLinks = [];
    $('.pagination a, a[href*="page"], a[href*="Page"]').each((_, el) => {
      pagLinks.push($(el).attr('href'));
    });
    console.log('Pagination links:', pagLinks);
  });
}).on('error', (e) => console.error(e));

