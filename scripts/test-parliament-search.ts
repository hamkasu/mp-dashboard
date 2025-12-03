/**
 * Test Parliament search to see what's being returned
 */

import axios from 'axios';
import https from 'https';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

async function testSearch() {
  const searchUrl = 'https://www.parlimen.gov.my/carian.html';
  const archiveUrl = 'https://www.parlimen.gov.my/jawapan-lisan-dr.html?uweb=dr&arkib=yes';

  console.log('🔍 Testing Parliament search for Penggal 1 (15|1|1)\n');

  try {
    // Test search for Penggal 1, Mesyuarat 1
    const formData = new URLSearchParams();
    formData.append('takwimnum[]', '15|1|1');
    formData.append('doctype[]', 'DR-jw');
    formData.append('dokumen[]', 'perbahasan');
    formData.append('searchref', 'jawapan-lisan-dr');
    formData.append('searchrefcode', 'dr');
    formData.append('DATETYPE', '0');
    formData.append('str', ''); // Empty search

    console.log('Sending POST request...');
    console.log('Form data:', Object.fromEntries(formData.entries()));
    console.log('');

    const response = await axios.post(searchUrl, formData, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5,ms;q=0.3',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': archiveUrl,
      },
      timeout: 30000,
      httpsAgent,
    });

    const html = response.data;
    console.log(`✅ Response received (${html.length} chars)`);
    console.log(`Status: ${response.status} ${response.statusText}\n`);

    // Look for PDF links
    const loadResultMatches = html.match(/loadResult\s*\(/g);
    const pdfCount = loadResultMatches ? loadResultMatches.length : 0;
    console.log(`📄 Found ${pdfCount} loadResult() calls`);

    // Look for error messages
    if (html.includes('tiada rekod') || html.includes('no record')) {
      console.log('⚠️  "No records found" message detected');
    }

    // Look for dates
    const dateMatches = html.match(/\d{1,2}\s+(Jan|Feb|Mac|Apr|Mei|Jun|Jul|Og|Sep|Okt|Nov|Dis)\w*\s+202[0-9]/gi);
    if (dateMatches) {
      console.log(`\n📅 Dates found: ${dateMatches.length}`);
      const uniqueDates = [...new Set(dateMatches)];
      console.log('Sample dates:', uniqueDates.slice(0, 5).join(', '));
    }

    // Extract a sample of the HTML
    console.log('\n📋 HTML Sample (first 1000 chars):');
    console.log('─'.repeat(70));
    console.log(html.substring(0, 1000));
    console.log('─'.repeat(70));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response: ${error.response.data?.substring(0, 500)}`);
    }
  }
}

testSearch();
