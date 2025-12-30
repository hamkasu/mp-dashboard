/**
 * Simple script to regenerate report cards immediately
 * This will update all MP report cards with the new Hansard-based attendance calculation
 */
import { updateAllReportCards } from '../server/services/report-card-service.js';

console.log('Starting report card regeneration...\n');

updateAllReportCards()
  .then(result => {
    console.log(`\n✓ SUCCESS!`);
    console.log(`  Updated: ${result.updated} report cards`);
    console.log(`  Created: ${result.created} report cards`);
    console.log('\nReport cards have been regenerated with correct attendance data.');
    console.log('Refresh the report card page to see the updated scores.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ ERROR regenerating report cards:');
    console.error(error);
    process.exit(1);
  });
