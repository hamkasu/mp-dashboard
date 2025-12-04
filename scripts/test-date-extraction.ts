/**
 * Test script to see what dates are being extracted from the Parliament archive
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

function parseMalaysianDate(dateText: string): string | undefined {
  const months: { [key: string]: string } = {
    'januari': '01', 'january': '01',
    'februari': '02', 'february': '02',
    'mac': '03', 'march': '03',
    'april': '04',
    'mei': '05', 'may': '05',
    'jun': '06', 'june': '06',
    'julai': '07', 'july': '07',
    'ogos': '08', 'august': '08',
    'september': '09',
    'oktober': '10', 'october': '10',
    'november': '11',
    'disember': '12', 'december': '12',
  };

  const match = dateText.toLowerCase().match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (!match) return undefined;

  const day = match[1].padStart(2, '0');
  const monthName = match[2].toLowerCase();
  const year = match[3];

  const month = months[monthName];
  if (!month) return undefined;

  return `${year}-${month}-${day}`;
}

function extractDatesFromArchivePage(html: string): string[] {
  const dates: string[] = [];
  const $ = cheerio.load(html);

  // Method 1: Extract individual dates from the visible tree
  const datePattern = /(\d{1,2})\s+(januari|februari|mac|april|mei|jun|julai|ogos|september|oktober|november|disember)\s+(\d{4})/gi;
  const bodyText = $('body').text();
  let match;
  while ((match = datePattern.exec(bodyText)) !== null) {
    const dateText = match[0];
    const parsed = parseMalaysianDate(dateText);
    if (parsed && !dates.includes(parsed)) {
      dates.push(parsed);
    }
  }

  console.log(`Found ${dates.length} individual dates from visible tree`);

  // Method 2: Extract date ranges from session headers
  const dateRangePattern = /\((\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\)/gi;

  while ((match = dateRangePattern.exec(html)) !== null) {
    const startDay = match[1].padStart(2, '0');
    const startMonth = match[2].padStart(2, '0');
    const startYear = match[3];
    const endDay = match[4].padStart(2, '0');
    const endMonth = match[5].padStart(2, '0');
    const endYear = match[6];

    const startDate = new Date(`${startYear}-${startMonth}-${startDay}`);
    const endDate = new Date(`${endYear}-${endMonth}-${endDay}`);

    console.log(`  Found range: ${startDay}/${startMonth}/${startYear} - ${endDay}/${endMonth}/${endYear}`);

    // Generate all weekday dates in this range
    const currentDate = new Date(startDate);
    let rangeCount = 0;
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        if (!dates.includes(dateStr)) {
          dates.push(dateStr);
          rangeCount++;
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    console.log(`    Generated ${rangeCount} weekday dates from this range`);
  }

  return dates.sort();
}

async function testExtraction() {
  const archiveUrl = 'https://www.parlimen.gov.my/jawapan-lisan-dr.html?uweb=dr&arkib=yes';

  console.log('🔍 Fetching Parliament archive page...\n');

  const response = await axios.get(archiveUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    timeout: 30000,
    httpsAgent,
  });

  const html = response.data;
  const dates = extractDatesFromArchivePage(html);

  console.log(`✅ Extracted ${dates.length} dates from archive:\n`);

  dates.forEach((date, index) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const dateCode = `${day}${month}${year}`;

    const jdrUrl = `JDR${dateCode}.pdf`;
    const plainUrl = `${dateCode}.pdf`;

    console.log(`${index + 1}. ${date} -> ${jdrUrl} or ${plainUrl}`);
  });

  console.log('\n📝 Checking if loadResult() calls exist in HTML...');
  const loadResultPattern = /loadResult\s*\([^)]+\)/g;
  const loadResultMatches = html.match(loadResultPattern) || [];
  console.log(`Found ${loadResultMatches.length} loadResult() calls`);

  if (loadResultMatches.length > 0) {
    console.log('\nFirst 10 loadResult() calls:');
    loadResultMatches.slice(0, 10).forEach((call, i) => {
      console.log(`  ${i + 1}. ${call}`);
    });
  }
}

testExtraction().catch(console.error);
