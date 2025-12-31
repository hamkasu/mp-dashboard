import { db } from '../server/db.js';
import { mpReportCards, mps } from '../shared/schema.js';
import { eq, like } from 'drizzle-orm';

(async () => {
  console.log('Checking database values for specific MPs...\n');

  // Check Ahmad Zahid
  const zahid = await db.select().from(mps).where(like(mps.name, '%Zahid%')).limit(1);
  if (zahid.length > 0) {
    console.log('===== AHMAD ZAHID HAMIDI =====');
    console.log('MP ID:', zahid[0].id);

    const reportCard = await db.select().from(mpReportCards).where(eq(mpReportCards.mpId, zahid[0].id));
    if (reportCard.length > 0) {
      console.log('Attendance Score:', reportCard[0].attendanceScore);
      console.log('Overall Score:', reportCard[0].overallScore);
      console.log('Grade:', reportCard[0].grade);
      console.log('Updated At:', reportCard[0].updatedAt);
    }
  }

  // Check Abdul Hadi
  const hadi = await db.select().from(mps).where(like(mps.name, '%Abdul Hadi%')).limit(1);
  if (hadi.length > 0) {
    console.log('\n===== ABDUL HADI AWANG =====');
    console.log('MP ID:', hadi[0].id);

    const reportCard = await db.select().from(mpReportCards).where(eq(mpReportCards.mpId, hadi[0].id));
    if (reportCard.length > 0) {
      console.log('Attendance Score:', reportCard[0].attendanceScore);
      console.log('Overall Score:', reportCard[0].overallScore);
      console.log('Grade:', reportCard[0].grade);
      console.log('Updated At:', reportCard[0].updatedAt);
    }
  }

  // Check a few more to see the pattern
  const allCards = await db.select().from(mpReportCards).limit(10);
  console.log('\n===== FIRST 10 REPORT CARDS =====');
  for (const card of allCards) {
    const mp = await db.select().from(mps).where(eq(mps.id, card.mpId)).limit(1);
    if (mp.length > 0) {
      console.log(`${mp[0].name}: Att=${card.attendanceScore}, Overall=${card.overallScore}, Grade=${card.grade}`);
    }
  }

  process.exit(0);
})();
