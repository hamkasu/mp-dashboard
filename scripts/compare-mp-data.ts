import * as fs from 'fs';
import { scrapeMpPhotos } from '../server/utils/scrape-mp-photos';

interface ScrapedMP {
  name: string;
  fullName: string;
  party: string;
  parliamentCode: string;
  constituency: string;
  photoUrl: string;
  profileUrl: string;
}

interface MPDataIssue {
  parliamentCode: string;
  issue: string;
  current?: string;
  correct?: string;
}

async function compareData() {
  // Read scraped data
  const scrapedData: ScrapedMP[] = JSON.parse(
    fs.readFileSync('scripts/scraped-mps.json', 'utf-8')
  );

  // Create a map of scraped data by parliament code
  const scrapedMap = new Map<string, ScrapedMP>();
  scrapedData.forEach(mp => {
    scrapedMap.set(mp.parliamentCode, mp);
  });

  console.log('\n=== MP DATA VERIFICATION REPORT ===\n');
  console.log(`Total MPs in official parliament website: ${scrapedData.length}`);
  console.log(`Expected total: 222\n`);

  // Check party breakdown
  const partyCount: Record<string, number> = {};
  scrapedData.forEach(mp => {
    partyCount[mp.party] = (partyCount[mp.party] || 0) + 1;
  });

  console.log('Party breakdown from official website:');
  Object.entries(partyCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([party, count]) => {
      console.log(`  ${party}: ${count} MPs`);
    });

  // Find MPs with UNKNOWN party or constituency
  const unknownParty = scrapedData.filter(mp => mp.party === 'UNKNOWN');
  const unknownConstituency = scrapedData.filter(mp => mp.constituency === 'UNKNOWN');

  if (unknownParty.length > 0) {
    console.log(`\n⚠️  ${unknownParty.length} MPs with UNKNOWN party:`);
    unknownParty.forEach(mp => {
      console.log(`  - ${mp.parliamentCode}: ${mp.fullName}`);
    });
  }

  if (unknownConstituency.length > 0) {
    console.log(`\n⚠️  ${unknownConstituency.length} MPs with UNKNOWN constituency:`);
    unknownConstituency.forEach(mp => {
      console.log(`  - ${mp.parliamentCode}: ${mp.fullName}`);
    });
  }

  // Check for missing parliament codes
  const allCodes = new Set<string>();
  for (let i = 1; i <= 222; i++) {
    const code = `P${String(i).padStart(3, '0')}`;
    allCodes.add(code);
  }

  const missingCodes: string[] = [];
  allCodes.forEach(code => {
    if (!scrapedMap.has(code)) {
      missingCodes.push(code);
    }
  });

  if (missingCodes.length > 0) {
    console.log(`\n⚠️  Missing parliament codes: ${missingCodes.join(', ')}`);
  }

  // Sample comparison with current data (show first 20 MPs)
  console.log('\n=== SAMPLE MP DATA (First 20) ===');
  console.log('Code | Name | Party | Constituency');
  console.log('-----|------|-------|-------------');
  scrapedData.slice(0, 20).forEach(mp => {
    console.log(`${mp.parliamentCode} | ${mp.name} | ${mp.party} | ${mp.constituency}`);
  });

  // Check photo URLs
  const photoMap = await scrapeMpPhotos();
  console.log(`\n=== PHOTO URL VERIFICATION ===`);
  console.log(`Successfully scraped ${photoMap.size} photo URLs`);
  
  let photosMatching = 0;
  let photosMismatched = 0;
  const photoIssues: Array<{code: string, scraped: string, current: string}> = [];

  scrapedData.forEach(mp => {
    const currentPhotoUrl = photoMap.get(mp.parliamentCode);
    if (currentPhotoUrl && mp.photoUrl && currentPhotoUrl === mp.photoUrl) {
      photosMatching++;
    } else if (currentPhotoUrl !== mp.photoUrl) {
      photosMismatched++;
      if (photoIssues.length < 10) {
        photoIssues.push({
          code: mp.parliamentCode,
          scraped: mp.photoUrl || 'none',
          current: currentPhotoUrl || 'none'
        });
      }
    }
  });

  console.log(`✓ Matching photo URLs: ${photosMatching}`);
  console.log(`✗ Mismatched photo URLs: ${photosMismatched}`);

  if (photoIssues.length > 0) {
    console.log('\nSample photo URL mismatches:');
    photoIssues.forEach(issue => {
      console.log(`  ${issue.code}:`);
      console.log(`    Current: ${issue.current}`);
      console.log(`    Scraped: ${issue.scraped}`);
    });
  }

  // Generate summary
  console.log('\n=== SUMMARY ===');
  console.log(`✓ Total MPs scraped: ${scrapedData.length}/222`);
  console.log(`✓ MPs with valid party: ${scrapedData.length - unknownParty.length}`);
  console.log(`✓ MPs with valid constituency: ${scrapedData.length - unknownConstituency.length}`);
  console.log(`✓ Photo URLs available: ${scrapedData.filter(mp => mp.photoUrl).length}`);
  
  if (missingCodes.length > 0) {
    console.log(`⚠️  Missing parliament codes: ${missingCodes.length}`);
  }
  
  if (unknownParty.length > 0 || unknownConstituency.length > 0) {
    console.log('\n⚠️  ACTION REQUIRED:');
    console.log('   Some MPs have UNKNOWN party or constituency.');
    console.log('   These need to be manually researched and updated.');
  }

  console.log('\n=== NEXT STEPS ===');
  console.log('1. Review the scraped data in scripts/scraped-mps.json');
  console.log('2. Update server/storage.ts seedMps() method with corrected data');
  console.log('3. Ensure all photo URLs are correctly mapped');
  console.log('4. Test the application with updated data\n');
}

compareData().catch(console.error);
