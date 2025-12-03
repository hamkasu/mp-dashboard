/**
 * Copyright by Calmic Sdn Bhd
 *
 * Script to import parliamentary oral answers from Parliament website
 */

import { scrapeAndSaveAnswers, batchProcessAnswerPdfs } from '../server/parliamentary-answers-scraper';

async function main() {
  console.log('🚀 Starting Parliamentary Oral Answers Import...\n');

  try {
    // Step 1: Scrape and save all oral answers
    console.log('📥 Step 1: Scraping oral answers from Parliament website...');
    const scrapeStats = await scrapeAndSaveAnswers();

    console.log('\n✅ Scraping complete!');
    console.log(`   - Saved: ${scrapeStats.saved} new answers`);
    console.log(`   - Updated: ${scrapeStats.updated} existing answers`);
    console.log(`   - Errors: ${scrapeStats.errors}`);

    // Step 2: Ask if user wants to process PDFs
    console.log('\n📄 Step 2: Processing PDFs (this may take a while)...');
    console.log('   This will download and analyze all PDF documents to extract:');
    console.log('   - Question details');
    console.log('   - Questioner constituency');
    console.log('   - Ministry information');
    console.log('   - Dates and session info\n');

    const pdfStats = await batchProcessAnswerPdfs();

    console.log('\n✅ PDF Processing complete!');
    console.log(`   - Total PDFs found: ${pdfStats.total}`);
    console.log(`   - Processed: ${pdfStats.processed}`);
    console.log(`   - Skipped (already exists): ${pdfStats.skipped}`);
    console.log(`   - Failed: ${pdfStats.failed}`);

    console.log('\n🎉 All done! Parliamentary oral answers have been imported.');

  } catch (error: any) {
    console.error('\n❌ Error during import:', error.message);
    process.exit(1);
  }
}

main();
