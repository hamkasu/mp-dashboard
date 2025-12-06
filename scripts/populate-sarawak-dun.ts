/**
 * Populate Sarawak DUN data from https://duns.sarawak.gov.my
 * Only runs if the Sarawak DUN tables are empty
 */

import { db } from '../server/db';
import { dunMembers } from '@shared/schema';
import { sarawakDunScraper } from '../server/sarawak-dun-scraper';
import { eq, and } from 'drizzle-orm';

async function populateSarawakDun() {
  console.log('Starting Sarawak DUN data population...');

  try {
    // Check if Sarawak DUN data already exists
    console.log('Checking for existing Sarawak DUN data...');
    const existingMembers = await db
      .select()
      .from(dunMembers)
      .where(eq(dunMembers.state, 'Sarawak'))
      .limit(1);

    if (existingMembers.length > 0) {
      console.log('✓ Sarawak DUN data already exists. Skipping population.');
      console.log(`Found ${existingMembers.length} existing member(s).`);
      return;
    }

    console.log('No existing Sarawak DUN data found. Starting scraper...');

    // Test connection first
    console.log('Testing connection to Sarawak DUN website...');
    const canConnect = await sarawakDunScraper.testConnection();

    if (!canConnect) {
      console.error('✗ Cannot connect to Sarawak DUN website. Please check your internet connection.');
      process.exit(1);
    }

    console.log('✓ Connection successful');

    // Scrape data
    console.log('Scraping Sarawak DUN members...');
    const scrapedMembers = await sarawakDunScraper.scrapeAllMembers();

    if (scrapedMembers.length === 0) {
      console.warn('⚠ No members found from scraping. The website structure may have changed.');
      process.exit(1);
    }

    console.log(`✓ Successfully scraped ${scrapedMembers.length} members`);

    // Insert into database
    console.log('Inserting members into database...');

    for (const member of scrapedMembers) {
      try {
        await db.insert(dunMembers).values({
          ...member,
          // Default Sarawak DUN salary values (as of 2024)
          baseSalary: 11130,
          serviceAllowance: 3870,
          constituencyAllowance: 10500,
          sittingAllowance: 450,
          travelAllowance: 2000,
          entertainmentAllowance: 1500,
          housingAllowance: 3000,
          totalMonthlyAllowance: 40000,
        });
        console.log(`  ✓ Inserted ${member.constituencyCode} - ${member.name}`);
      } catch (err) {
        console.error(`  ✗ Error inserting ${member.constituencyCode}:`, err);
      }
    }

    // Verify insertion
    const insertedCount = await db
      .select()
      .from(dunMembers)
      .where(eq(dunMembers.state, 'Sarawak'));

    console.log(`\n✓ Successfully populated ${insertedCount.length} Sarawak DUN members`);
    console.log('\nSummary:');
    console.log(`  - Total scraped: ${scrapedMembers.length}`);
    console.log(`  - Total inserted: ${insertedCount.length}`);

    // Show sample data
    if (insertedCount.length > 0) {
      console.log('\nSample members:');
      insertedCount.slice(0, 5).forEach(m => {
        console.log(`  ${m.constituencyCode} ${m.constituencyName}: ${m.name} (${m.party || 'No party'})`);
      });
    }

  } catch (error) {
    console.error('✗ Error populating Sarawak DUN data:', error);
    process.exit(1);
  }
}

// Run the script
populateSarawakDun()
  .then(() => {
    console.log('\n✓ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Script failed:', error);
    process.exit(1);
  });
