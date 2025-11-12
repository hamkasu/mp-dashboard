import { runHansardSync } from './hansard-cron';
import { db } from './db';

async function main() {
  try {
    console.log('Starting manual Hansard sync...\n');
    const result = await runHansardSync({ triggeredBy: 'manual' });
    
    console.log('\n=== SYNC COMPLETE ===');
    console.log(`Duration: ${result.durationMs}ms`);
    console.log(`Records found: ${result.recordsFound}`);
    console.log(`Records inserted: ${result.recordsInserted}`);
    console.log(`Records skipped: ${result.recordsSkipped}`);
    console.log(`Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\nErrors encountered:');
      result.errors.forEach(err => {
        console.log(`  - ${err.sessionNumber}: ${err.error}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Fatal error during sync:', error);
    process.exit(1);
  }
}

main();
