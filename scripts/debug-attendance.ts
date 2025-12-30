import { db } from '../server/db.js';
import { mps, mpReportCards } from '../shared/schema.js';
import { like, eq } from 'drizzle-orm';

(async () => {
  console.log('Querying database for MPs with attendance issues...\n');

  const ahmadZahid = await db.select().from(mps).where(like(mps.name, '%Zahid%'));
  const abdulHadi = await db.select().from(mps).where(like(mps.name, '%Abdul Hadi%'));
  const chowKon = await db.select().from(mps).where(like(mps.name, '%Chow Kon%'));

  console.log('===== AHMAD ZAHID HAMIDI =====');
  if (ahmadZahid.length > 0) {
    for (const mp of ahmadZahid) {
      console.log('Name:', mp.name);
      console.log('ID:', mp.id);
      console.log('Days Attended:', mp.daysAttended);
      console.log('Total Parliament Days:', mp.totalParliamentDays);
      if (mp.totalParliamentDays > 0) {
        const pct = (mp.daysAttended / mp.totalParliamentDays * 100).toFixed(2);
        console.log('Attendance %:', pct);
      } else {
        console.log('Attendance %: N/A (no parliament days recorded)');
      }

      const reportCard = await db.select().from(mpReportCards).where(eq(mpReportCards.mpId, mp.id));
      if (reportCard.length > 0) {
        console.log('Attendance Score (Report Card):', reportCard[0].attendanceScore);
        console.log('Overall Score:', reportCard[0].overallScore);
        console.log('Grade:', reportCard[0].grade);
      } else {
        console.log('No report card found');
      }
      console.log('');
    }
  }

  console.log('===== ABDUL HADI AWANG =====');
  if (abdulHadi.length > 0) {
    for (const mp of abdulHadi) {
      console.log('Name:', mp.name);
      console.log('ID:', mp.id);
      console.log('Days Attended:', mp.daysAttended);
      console.log('Total Parliament Days:', mp.totalParliamentDays);
      if (mp.totalParliamentDays > 0) {
        const pct = (mp.daysAttended / mp.totalParliamentDays * 100).toFixed(2);
        console.log('Attendance %:', pct);
      } else {
        console.log('Attendance %: N/A (no parliament days recorded)');
      }

      const reportCard = await db.select().from(mpReportCards).where(eq(mpReportCards.mpId, mp.id));
      if (reportCard.length > 0) {
        console.log('Attendance Score (Report Card):', reportCard[0].attendanceScore);
        console.log('Overall Score:', reportCard[0].overallScore);
        console.log('Grade:', reportCard[0].grade);
      } else {
        console.log('No report card found');
      }
      console.log('');
    }
  }

  console.log('===== CHOW KON YEOW =====');
  if (chowKon.length > 0) {
    for (const mp of chowKon) {
      console.log('Name:', mp.name);
      console.log('ID:', mp.id);
      console.log('Days Attended:', mp.daysAttended);
      console.log('Total Parliament Days:', mp.totalParliamentDays);
      if (mp.totalParliamentDays > 0) {
        const pct = (mp.daysAttended / mp.totalParliamentDays * 100).toFixed(2);
        console.log('Attendance %:', pct);
      } else {
        console.log('Attendance %: N/A (no parliament days recorded)');
      }

      const reportCard = await db.select().from(mpReportCards).where(eq(mpReportCards.mpId, mp.id));
      if (reportCard.length > 0) {
        console.log('Attendance Score (Report Card):', reportCard[0].attendanceScore);
        console.log('Overall Score:', reportCard[0].overallScore);
        console.log('Grade:', reportCard[0].grade);
      } else {
        console.log('No report card found');
      }
      console.log('');
    }
  }

  // Also check how many MPs have 0 attendance score
  const allReportCards = await db.select().from(mpReportCards);
  const zeroAttendance = allReportCards.filter(card => card.attendanceScore === 0);
  console.log(`\n===== SUMMARY =====`);
  console.log(`Total MPs with report cards: ${allReportCards.length}`);
  console.log(`MPs with 0 attendance score: ${zeroAttendance.length}`);

  if (zeroAttendance.length > 0) {
    console.log('\nMPs with 0 attendance score:');
    for (const card of zeroAttendance) {
      const mpData = await db.select().from(mps).where(eq(mps.id, card.mpId)).limit(1);
      if (mpData.length > 0) {
        const mp = mpData[0];
        console.log(`- ${mp.name}: ${mp.daysAttended}/${mp.totalParliamentDays} days`);
      }
    }
  }

  process.exit(0);
})();
