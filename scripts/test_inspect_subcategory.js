const https = require('https');
const cheerio = require('cheerio');

https.get('https://www.maharashtradirectory.com/category/machinery-section/air-compressors-and-spares.html', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode, 'Length:', data.length);
    const $ = cheerio.load(data);
    const cards = $('.rc-body');
    console.log('rc-body cards count:', cards.length);
    const prodLinks = [];
    $('a[href*="/product/"]').each((_, el) => {
      prodLinks.push($(el).attr('href'));
    });
    console.log('product links count:', prodLinks.length);
    console.log('Sample prod links:', prodLinks.slice(0, 10));
    
    // check company links
    const compLinks = [];
    $('a[href*="/companyinfo/"], a[href*="/cataloginfo/"]').each((_, el) => {
      compLinks.push($(el).attr('href'));
    });
    console.log('Company / catalog links count:', compLinks.length);
    console.log('Sample company links:', compLinks.slice(0, 5));
    
    // Check if any other cards
    $('h2, h3, .card, [class*="item"]').each((_, el) => {
      const t = $(el).text().trim();
      if (t.length > 5 && t.length < 50) {
        // console.log('Heading:', t);
      }
    });
  });
}).on('error', (e) => console.error(e));

