/**
 * Script to refresh all MP data (attendance and speech stats)
 */
import { refreshAllMpData } from '../server/aggregate-speeches';

async function main() {
  console.log('Starting MP data refresh...');
  try {
    const result = await refreshAllMpData();
    console.log('Refresh complete!');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error during refresh:', error);
    process.exit(1);
  }
  process.exit(0);
}

main();
