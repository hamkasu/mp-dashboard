/**
 * Populate Selangor DUN data from https://dewan.selangor.gov.my
 * Only runs if the Selangor DUN tables are empty
 */

import { db } from '../server/db';
import { dunMembers } from '@shared/schema';
import { selangorDunScraper } from '../server/selangor-dun-scraper';
import { eq } from 'drizzle-orm';

async function populateSelangorDun() {
  console.log('Starting Selangor DUN data population...');

  try {
    console.log('Checking for existing Selangor DUN data...');
    const existingMembers = await db
      .select()
      .from(dunMembers)
      .where(eq(dunMembers.state, 'Selangor'))
      .limit(1);

    if (existingMembers.length > 0) {
      console.log('✓ Selangor DUN data already exists. Skipping population.');
      console.log(`Found ${existingMembers.length} existing member(s).`);
      return;
    }

    console.log('No existing Selangor DUN data found. Starting scraper...');

    console.log('Testing connection to Selangor DUN website...');
    const canConnect = await selangorDunScraper.testConnection();

    if (!canConnect) {
      console.error('✗ Cannot connect to Selangor DUN website. Please check your internet connection.');
      process.exit(1);
    }

    console.log('✓ Connection successful');

    console.log('Scraping Selangor DUN members...');
    const scrapedMembers = await selangorDunScraper.scrapeAllMembers();

    if (scrapedMembers.length === 0) {
      console.warn('⚠ No members found from scraping. The website structure may have changed.');
      process.exit(1);
    }

    console.log(`✓ Successfully scraped ${scrapedMembers.length} members`);

    console.log('Inserting members into database...');

    for (const member of scrapedMembers) {
      try {
        await db.insert(dunMembers).values({
          ...member,
          baseSalary: 8000,
          serviceAllowance: 3000,
          constituencyAllowance: 8000,
          sittingAllowance: 400,
          travelAllowance: 2000,
          entertainmentAllowance: 1500,
          housingAllowance: 2100,
          totalMonthlyAllowance: 25000,
        });
        console.log(`  ✓ Inserted ${member.constituencyCode} - ${member.name}`);
      } catch (err) {
        console.error(`  ✗ Error inserting ${member.constituencyCode}:`, err);
      }
    }

    const insertedCount = await db
      .select()
      .from(dunMembers)
      .where(eq(dunMembers.state, 'Selangor'));

    console.log(`\n✓ Successfully populated ${insertedCount.length} Selangor DUN members`);
    console.log('\nSummary:');
    console.log(`  - Total scraped: ${scrapedMembers.length}`);
    console.log(`  - Total inserted: ${insertedCount.length}`);

    if (insertedCount.length > 0) {
      console.log('\nSample members:');
      insertedCount.slice(0, 5).forEach(m => {
        console.log(`  ${m.constituencyCode} ${m.constituencyName}: ${m.name} (${m.party || 'No party'})`);
      });
    }

  } catch (error) {
    console.error('✗ Error populating Selangor DUN data:', error);
    process.exit(1);
  }
}

populateSelangorDun()
  .then(() => {
    console.log('\n✓ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Script failed:', error);
    process.exit(1);
  });
