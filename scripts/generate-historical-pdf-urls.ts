/**
 * Generate PDF URLs for all known Parliament sitting dates
 * Based on the file structure shown: https://www.parlimen.gov.my/files/jindex/pdf/DDMMYYYY.pdf
 */

import axios from 'axios';
import https from 'https';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Parliament sitting dates from the file structure shown by user
// Penggal Kedua (Second Session) - Mesyuarat Pertama (13/02/2023 - 04/04/2023)
const penggal2Mesyuarat1 = [
  '14022023', '15022023', '16022023', '20022023', '21022023', '22022023', '23022023',
  '27022023', '28022023', '01032023', '02032023', '06032023', '07032023', '08032023',
  '09032023', '13032023', '14032023', '15032023', '16032023', '20032023', '21032023',
  '22032023', '23032023', '27032023', '28032023', '29032023', '30032023'
];

async function testPdfAccess(dateStr: string): Promise<boolean> {
  const url = `https://www.parlimen.gov.my/files/jindex/pdf/${dateStr}.pdf`;

  try {
    const response = await axios.head(url, {
      httpsAgent,
      timeout: 10000,
    });

    if (response.status === 200) {
      console.log(`✅ ${dateStr}: PDF exists`);
      return true;
    }
    return false;
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log(`❌ ${dateStr}: Not found (404)`);
    } else {
      console.log(`⚠️  ${dateStr}: ${error.message}`);
    }
    return false;
  }
}

async function main() {
  console.log('🔍 Testing PDF URLs for Penggal 2, Mesyuarat 1 dates\n');
  console.log('URL pattern: https://www.parlimen.gov.my/files/jindex/pdf/DDMMYYYY.pdf\n');

  let foundCount = 0;
  const foundUrls: string[] = [];

  for (const dateStr of penggal2Mesyuarat1) {
    const exists = await testPdfAccess(dateStr);
    if (exists) {
      foundCount++;
      foundUrls.push(`https://www.parlimen.gov.my/files/jindex/pdf/${dateStr}.pdf`);
    }

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 Results: ${foundCount}/${penggal2Mesyuarat1.length} PDFs found`);
  console.log(`${'='.repeat(70)}`);

  if (foundUrls.length > 0) {
    console.log('\n✅ Found PDF URLs:');
    foundUrls.forEach(url => console.log(`   ${url}`));
  }
}

main();
