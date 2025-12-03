/**
 * Script to check what sessions are available on Parliament archive
 */

import axios from 'axios';
import https from 'https';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

interface ExtractedPdfLink {
  pdfPath: string;
  pdfFilename: string;
  dateText: string;
  fullUrl: string;
}

function extractPdfLinksFromPage(html: string, baseUrl: string): ExtractedPdfLink[] {
  const links: ExtractedPdfLink[] = [];

  // Match the loadResult JavaScript calls
  // Pattern: loadResult('/files/jindex/pdf/JDR{DDMMYYYY}.pdf','JDR{DDMMYYYY}.pdf')
  const regex = /loadResult\s*\(\s*['"]([^'"]+\.pdf)['"],\s*['"]([^'"]+)['"].*?\)\s*;?\s*['">\s]*([^<]+)/gi;

  let match;
  while ((match = regex.exec(html)) !== null) {
    const pdfPath = match[1];
    const pdfFilename = match[2];
    const dateText = match[3].trim();

    // Build full URL
    const fullUrl = pdfPath.startsWith('http')
      ? pdfPath
      : `${baseUrl}${pdfPath.startsWith('/') ? '' : '/'}${pdfPath}`;

    links.push({
      pdfPath,
      pdfFilename,
      dateText,
      fullUrl,
    });
  }

  return links;
}

async function checkArchive() {
  const archiveUrl = 'https://www.parlimen.gov.my/jawapan-lisan-dr.html?uweb=dr&arkib=yes';
  const baseUrl = 'https://www.parlimen.gov.my';

  console.log('🔍 Checking Parliament archive...\n');
  console.log(`URL: ${archiveUrl}\n`);

  try {
    const response = await axios.get(archiveUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5,ms;q=0.3',
      },
      timeout: 30000,
      httpsAgent,
    });

    const html = response.data;
    const pdfLinks = extractPdfLinksFromPage(html, baseUrl);

    console.log(`✅ Found ${pdfLinks.length} PDF links in archive\n`);

    // Group by year
    const byYear: Record<string, ExtractedPdfLink[]> = {};
    for (const link of pdfLinks) {
      const year = link.dateText.match(/202[0-9]/)?.[0] || 'Unknown';
      if (!byYear[year]) {
        byYear[year] = [];
      }
      byYear[year].push(link);
    }

    // Display results
    for (const year of Object.keys(byYear).sort()) {
      console.log(`\n📅 Year ${year} (${byYear[year].length} sessions):`);
      console.log('─'.repeat(60));

      // Sort by date and show first and last
      const sessions = byYear[year].sort((a, b) => a.dateText.localeCompare(b.dateText));

      if (sessions.length <= 5) {
        // Show all if 5 or fewer
        sessions.forEach(session => {
          console.log(`  • ${session.dateText}`);
        });
      } else {
        // Show first 3 and last 2
        sessions.slice(0, 3).forEach(session => {
          console.log(`  • ${session.dateText}`);
        });
        console.log(`  ... (${sessions.length - 5} more sessions) ...`);
        sessions.slice(-2).forEach(session => {
          console.log(`  • ${session.dateText}`);
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📊 TOTAL: ${pdfLinks.length} sessions found`);

    // Check for 2022 data
    const has2022 = byYear['2022'] && byYear['2022'].length > 0;
    if (!has2022) {
      console.log('\n⚠️  WARNING: No 2022 sessions found!');
      console.log('   Penggal Pertama (First Session) of Parlimen 15 might not be in the archive.');
    } else {
      console.log(`\n✅ 2022 data found: ${byYear['2022'].length} sessions`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkArchive();
