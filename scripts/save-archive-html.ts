import axios from 'axios';
import * as fs from 'fs';
import https from 'https';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

async function saveArchiveHtml() {
  const archiveUrl = 'https://www.parlimen.gov.my/jawapan-lisan-dr.html?uweb=dr&arkib=yes';

  console.log('Fetching archive page...');
  const response = await axios.get(archiveUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html',
    },
    timeout: 30000,
    httpsAgent,
  });

  const filename = '/tmp/parliament-archive.html';
  fs.writeFileSync(filename, response.data);
  console.log(`Saved to ${filename}`);

  // Look for date range patterns
  const html = response.data;
  console.log('\nSearching for date range patterns...\n');

  const patterns = [
    /\((\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\)/g,
    /(\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/g,
    /Mesyuarat.*?\d{4}/gi,
    /Penggal.*?\d{4}/gi,
  ];

  patterns.forEach((pattern, i) => {
    const matches = html.match(pattern);
    if (matches) {
      console.log(`Pattern ${i + 1} found ${matches.length} matches:`);
      matches.slice(0, 5).forEach(m => console.log(`  - ${m}`));
    } else {
      console.log(`Pattern ${i + 1}: No matches`);
    }
  });
}

saveArchiveHtml().catch(console.error);
