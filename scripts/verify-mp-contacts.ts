/**
 * Script to verify MP contact information against parliament.gov.my
 * Fetches official data and compares against current database state
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

interface MismatchRecord {
  id: string;
  name: string;
  code: string;
  constituency: string;
  state: string;
  current_address: string;
  current_email: string;
}

interface OfficialContactInfo {
  email?: string | null;
  telephone?: string | null;
  fax?: string | null;
  address?: string | null;
  ministryOffice?: string | null;
}

interface ComparisonRecord {
  mpName: string;
  parliamentCode: string;
  constituency: string;
  state: string;
  currentEmail: string;
  currentAddress: string;
  officialEmail: string | null;
  officialAddress: string | null;
  officialMinistryOffice: string | null;
  emailMatch: boolean;
  addressMatch: boolean;
  confidence: string;
  recommendation: string;
}

const httpsAgent = new (require('https').Agent)({
  rejectUnauthorized: false,
  keepAlive: true,
});

async function fetchOfficialContactInfo(parliamentCode: string): Promise<OfficialContactInfo> {
  try {
    // Construct the parliament profile URL using parliament code
    const profileUrl = `https://www.parlimen.gov.my/ahli-detail.html?name=${parliamentCode}`;

    console.log(`  Fetching ${parliamentCode}...`);
    const response = await axios.get(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000,
      httpsAgent,
    });

    const $ = cheerio.load(response.data);
    const contactInfo: OfficialContactInfo = {};

    // Extract Email
    const emailMatch = response.data.match(/[\w\.-]+@[\w\.-]+\.\w+/);
    if (emailMatch) {
      const email = emailMatch[0].toLowerCase();
      const siteWideEmails = ['info@parlimen.gov.my', 'webmaster@parlimen.gov.my', 'admin@parlimen.gov.my'];
      if (!siteWideEmails.includes(email)) {
        contactInfo.email = email;
      }
    }

    // Extract Address using table-based extraction
    $('tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        const labelCell = $(cells[0]).text().trim().toLowerCase();
        const valueCell = $(cells[1]).text().trim();

        if (labelCell.includes('alamat') && !labelCell.includes('surat') && !contactInfo.address) {
          contactInfo.address = valueCell;
        } else if (labelCell.includes('alamat surat') && !contactInfo.address) {
          contactInfo.address = valueCell;
        } else if (labelCell.includes('kementerian') || labelCell.includes('menteri')) {
          contactInfo.ministryOffice = valueCell;
        }
      }
    });

    // Fallback: look for email in the page
    const emailInPage = response.data.match(/Email[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (emailInPage && !contactInfo.email) {
      contactInfo.email = emailInPage[1].toLowerCase();
    }

    return contactInfo;
  } catch (error: any) {
    console.log(`  ⚠️  Error fetching ${parliamentCode}: ${error.message}`);
    return {};
  }
}

function normalizeAddress(addr: string | null): string {
  if (!addr) return '';
  return addr.trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeEmail(email: string | null): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

async function main() {
  console.log('Reading mismatches data...');
  const mismatches = JSON.parse(
    fs.readFileSync('/root/.claude/uploads/636ac469-07b2-52f4-b458-56e3800e20d2/e0e8fbf3-mismatches_for_review.json', 'utf-8')
  ) as MismatchRecord[];

  console.log(`\nFound ${mismatches.length} mismatched records`);
  console.log('Fetching official data from parliament.gov.my...\n');

  const comparisons: ComparisonRecord[] = [];
  let successful = 0;

  for (const mp of mismatches) {
    const officialInfo = await fetchOfficialContactInfo(mp.code);

    const emailNormCurrent = normalizeEmail(mp.current_email);
    const emailNormOfficial = normalizeEmail(officialInfo.email || '');
    const emailMatch = emailNormCurrent === emailNormOfficial;

    const addrNormCurrent = normalizeAddress(mp.current_address);
    const addrNormOfficial = normalizeAddress(officialInfo.address || '');
    const addressMatch = addrNormCurrent === addrNormOfficial;

    // Determine confidence and recommendation
    let confidence = 'Medium';
    let recommendation = 'Review Manually';

    if (emailMatch && addressMatch) {
      confidence = 'High';
      recommendation = 'Data Correct - No Action';
    } else if (officialInfo.email && officialInfo.address) {
      confidence = 'High';
      recommendation = 'Update with Official Data';
    } else if (officialInfo.email || officialInfo.address) {
      confidence = 'Medium';
      recommendation = 'Partial Data Available - Review';
    } else {
      confidence = 'Low';
      recommendation = 'Could Not Fetch Official Data';
    }

    comparisons.push({
      mpName: mp.name,
      parliamentCode: mp.code,
      constituency: mp.constituency,
      state: mp.state,
      currentEmail: mp.current_email,
      currentAddress: mp.current_address.substring(0, 60) + (mp.current_address.length > 60 ? '...' : ''),
      officialEmail: officialInfo.email || 'NOT FOUND',
      officialAddress: officialInfo.address ? officialInfo.address.substring(0, 60) + (officialInfo.address.length > 60 ? '...' : '') : 'NOT FOUND',
      officialMinistryOffice: officialInfo.ministryOffice ? officialInfo.ministryOffice.substring(0, 60) : null,
      emailMatch,
      addressMatch,
      confidence,
      recommendation,
    });

    if (officialInfo.email || officialInfo.address) {
      successful++;
    }

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Generate CSV
  const csvHeader = [
    'MP Name',
    'Parliament Code',
    'Constituency',
    'State',
    'Current Email',
    'Current Address (truncated)',
    'Official Email',
    'Official Address (truncated)',
    'Official Ministry Office',
    'Email Match',
    'Address Match',
    'Confidence',
    'Recommendation'
  ].join(',');

  const csvRows = comparisons.map(r => [
    `"${r.mpName}"`,
    r.parliamentCode,
    `"${r.constituency}"`,
    r.state,
    `"${r.currentEmail}"`,
    `"${r.currentAddress}"`,
    `"${r.officialEmail}"`,
    `"${r.officialAddress}"`,
    `"${r.officialMinistryOffice || ''}"`,
    r.emailMatch ? 'YES' : 'NO',
    r.addressMatch ? 'YES' : 'NO',
    r.confidence,
    `"${r.recommendation}"`,
  ].join(','));

  const csv = [csvHeader, ...csvRows].join('\n');

  const outputPath = '/home/user/mp-dashboard/PRIORITY_0_CONTACT_COMPARISON.csv';
  fs.writeFileSync(outputPath, csv);

  console.log(`\n✅ Comparison data saved to: ${outputPath}`);
  console.log(`\nSummary:`);
  console.log(`- Total records processed: ${comparisons.length}`);
  console.log(`- Successfully fetched official data: ${successful}/${comparisons.length}`);
  console.log(`- Records with email match: ${comparisons.filter(r => r.emailMatch).length}`);
  console.log(`- Records with address match: ${comparisons.filter(r => r.addressMatch).length}`);
  console.log(`- High confidence recommendations: ${comparisons.filter(r => r.confidence === 'High').length}`);
}

main().catch(console.error);
