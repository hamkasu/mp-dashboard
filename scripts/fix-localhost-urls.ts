import { db } from "../server/db";
import { hansardRecords } from "../shared/schema";
import { eq } from "drizzle-orm";
import { getPublicBaseUrl, buildPdfUrl } from "../server/utils/url-helper";

async function fixLocalhostUrls() {
  console.log('🔧 Fixing localhost URLs in Hansard records...');
  
  // Get the correct base URL for this environment
  const correctBaseUrl = getPublicBaseUrl();
  console.log(`   Using base URL: ${correctBaseUrl}`);
  
  // Fetch all Hansard records
  const records = await db.select().from(hansardRecords);
  console.log(`   Found ${records.length} Hansard records`);
  
  let fixedCount = 0;
  
  for (const record of records) {
    let needsUpdate = false;
    const updatedPdfLinks: string[] = [];
    
    for (const pdfLink of record.pdfLinks) {
      // Check if this is a localhost URL
      if (pdfLink.includes('localhost:') || pdfLink.startsWith('http://localhost')) {
        // Extract just the filename/path part
        const match = pdfLink.match(/attached_assets\/.+\.pdf$/);
        if (match) {
          const relativePath = match[0];
          const fixedUrl = buildPdfUrl(correctBaseUrl, relativePath);
          updatedPdfLinks.push(fixedUrl);
          needsUpdate = true;
          console.log(`   ✓ Fixed: ${pdfLink} → ${fixedUrl}`);
        } else {
          // Keep as-is if we can't parse it
          updatedPdfLinks.push(pdfLink);
        }
      } else {
        // Keep non-localhost URLs as-is
        updatedPdfLinks.push(pdfLink);
      }
    }
    
    if (needsUpdate) {
      await db
        .update(hansardRecords)
        .set({ pdfLinks: updatedPdfLinks })
        .where(eq(hansardRecords.id, record.id));
      fixedCount++;
    }
  }
  
  console.log(`✅ Fixed ${fixedCount} Hansard records with localhost URLs`);
}

fixLocalhostUrls()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error fixing URLs:', error);
    process.exit(1);
  });
