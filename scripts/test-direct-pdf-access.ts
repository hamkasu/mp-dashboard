/**
 * Test direct PDF access by constructing URLs based on known date patterns
 */

import axios from 'axios';
import https from 'https';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

async function testDirectAccess() {
  const baseUrl = 'https://www.parlimen.gov.my/files/jindex/pdf';

  // Test some dates from late 2022 (when Penggal 1 would have been)
  // Format: JDR{DDMMYYYY}.pdf
  const testDates = [
    '19122022', // 19 December 2022
    '20122022', // 20 December 2022
    '21122022', // 21 December 2022
    '22122022', // 22 December 2022
    '14022023', // 14 February 2023 (start of Penggal 2)
    '15022023', // 15 February 2023
  ];

  console.log('🔍 Testing direct PDF access for historical dates\n');

  for (const date of testDates) {
    const pdfUrl = `${baseUrl}/JDR${date}.pdf`;

    try {
      const response = await axios.head(pdfUrl, {
        httpsAgent,
        timeout: 10000,
      });

      console.log(`✅ ${date}: PDF EXISTS - ${pdfUrl}`);
      console.log(`   Status: ${response.status}, Size: ${response.headers['content-length']} bytes\n`);

    } catch (error: any) {
      if (error.response) {
        console.log(`❌ ${date}: ${error.response.status} - PDF not found`);
      } else {
        console.log(`❌ ${date}: ${error.message}`);
      }
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n💡 If PDFs exist, we can generate URLs directly instead of searching!');
}

testDirectAccess();
