/**
 * Test script to regenerate report cards and verify the attendance fix
 */
import { updateAllReportCards, getReportCardsWithDetails } from '../server/services/report-card-service.js';

(async () => {
  console.log('Starting report card regeneration test...\n');

  try {
    // Regenerate all report cards
    console.log('Regenerating report cards with Hansard-based attendance...');
    const result = await updateAllReportCards();
    console.log(`✓ Report cards updated: ${result.updated} updated, ${result.created} created\n`);

    // Check specific MPs that had 0 attendance scores
    console.log('Checking MPs that previously had 0 attendance scores:\n');

    const reportCards = await getReportCardsWithDetails();

    const ahmadZahid = reportCards.find(card => card.mp.name.includes('Zahid'));
    const abdulHadi = reportCards.find(card => card.mp.name.includes('Abdul Hadi'));
    const chowKon = reportCards.find(card => card.mp.name.includes('Chow Kon'));

    if (ahmadZahid) {
      console.log('===== AHMAD ZAHID HAMIDI =====');
      console.log('Name:', ahmadZahid.mp.name);
      console.log('Attendance Score:', ahmadZahid.attendanceScore);
      console.log('Overall Score:', ahmadZahid.overallScore);
      console.log('Grade:', ahmadZahid.grade);
      console.log('');
    }

    if (abdulHadi) {
      console.log('===== ABDUL HADI AWANG =====');
      console.log('Name:', abdulHadi.mp.name);
      console.log('Attendance Score:', abdulHadi.attendanceScore);
      console.log('Overall Score:', abdulHadi.overallScore);
      console.log('Grade:', abdulHadi.grade);
      console.log('');
    }

    if (chowKon) {
      console.log('===== CHOW KON YEOW =====');
      console.log('Name:', chowKon.mp.name);
      console.log('Attendance Score:', chowKon.attendanceScore);
      console.log('Overall Score:', chowKon.overallScore);
      console.log('Grade:', chowKon.grade);
      console.log('');
    }

    // Check how many MPs have 0 attendance score
    const zeroAttendance = reportCards.filter(card => card.attendanceScore === 0);
    console.log('===== SUMMARY =====');
    console.log(`Total MPs with report cards: ${reportCards.length}`);
    console.log(`MPs with 0 attendance score: ${zeroAttendance.length}`);

    if (zeroAttendance.length > 0) {
      console.log('\nMPs still with 0 attendance score:');
      for (const card of zeroAttendance.slice(0, 10)) {
        console.log(`- ${card.mp.name}`);
      }
      if (zeroAttendance.length > 10) {
        console.log(`... and ${zeroAttendance.length - 10} more`);
      }
    } else {
      console.log('\n✓ No MPs with 0 attendance score - bug fixed!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
