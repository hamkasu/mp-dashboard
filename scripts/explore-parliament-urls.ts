/**
 * Script to explore different Parliament URLs to find all historical sessions
 */

import axios from 'axios';
import https from 'https';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

async function testUrl(url: string, description: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🔍 Testing: ${description}`);
  console.log(`   URL: ${url}`);
  console.log('─'.repeat(70));

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5,ms;q=0.3',
      },
      timeout: 30000,
      httpsAgent,
    });

    const html = response.data;

    // Count loadResult calls (PDF links)
    const loadResultMatches = html.match(/loadResult\s*\(/g);
    const pdfCount = loadResultMatches ? loadResultMatches.length : 0;

    // Look for year mentions
    const years = new Set<string>();
    const yearMatches = html.matchAll(/\b(202[0-9])\b/g);
    for (const match of yearMatches) {
      years.add(match[1]);
    }

    // Look for session/penggal references
    const hasSessionInfo = html.toLowerCase().includes('penggal') || html.toLowerCase().includes('mesyuarat');

    console.log(`✅ Response received (${html.length} chars)`);
    console.log(`   - PDF links found: ${pdfCount}`);
    console.log(`   - Years mentioned: ${Array.from(years).sort().join(', ')}`);
    console.log(`   - Has session info: ${hasSessionInfo ? 'Yes' : 'No'}`);

    // Look for navigation or archive links
    const hasArchiveLink = html.toLowerCase().includes('arkib=');
    const hasPageParam = html.toLowerCase().includes('page=') || html.toLowerCase().includes('halaman=');

    if (hasArchiveLink) console.log(`   - Has archive parameter: Yes`);
    if (hasPageParam) console.log(`   - Has pagination: Yes`);

    return { pdfCount, years: Array.from(years).sort(), html };

  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🚀 Exploring Parliament website URLs for historical Jawapan Lisan\n');

  const urls = [
    {
      url: 'https://www.parlimen.gov.my/jawapan-lisan-dr.html?uweb=dr',
      description: 'Main page (current session)'
    },
    {
      url: 'https://www.parlimen.gov.my/jawapan-lisan-dr.html?uweb=dr&arkib=yes',
      description: 'Archive page (arkib=yes)'
    },
    {
      url: 'https://www.parlimen.gov.my/jawapan-lisan-dr.html?uweb=dr&arkib=yes&tahun=2024',
      description: 'Archive with year 2024'
    },
    {
      url: 'https://www.parlimen.gov.my/jawapan-lisan-dr.html?uweb=dr&arkib=yes&tahun=2023',
      description: 'Archive with year 2023'
    },
    {
      url: 'https://www.parlimen.gov.my/jawapan-lisan-dr.html?uweb=dr&arkib=yes&tahun=2022',
      description: 'Archive with year 2022'
    },
  ];

  const results: any[] = [];

  for (const { url, description } of urls) {
    const result = await testUrl(url, description);
    if (result) {
      results.push({ url, description, ...result });
    }
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));

  let totalPdfs = 0;
  const allYears = new Set<string>();

  for (const result of results) {
    totalPdfs += result.pdfCount;
    result.years.forEach((y: string) => allYears.add(y));
  }

  console.log(`\nTotal PDF links found across all URLs: ${totalPdfs}`);
  console.log(`All years found: ${Array.from(allYears).sort().join(', ')}`);

  // Find URLs with most PDFs
  const sorted = results.sort((a, b) => b.pdfCount - a.pdfCount);
  console.log(`\n📌 URLs with most PDFs:`);
  sorted.slice(0, 3).forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.description}: ${r.pdfCount} PDFs`);
  });

  // Check if we found 2022 data
  if (allYears.has('2022')) {
    console.log(`\n✅ Found 2022 data!`);
    const with2022 = results.find(r => r.years.includes('2022'));
    if (with2022) {
      console.log(`   Best URL: ${with2022.description}`);
      console.log(`   ${with2022.url}`);
    }
  } else {
    console.log(`\n⚠️  No 2022 data found in any tested URL`);
    console.log(`   Penggal Pertama might require a different approach`);
  }
}

main();
