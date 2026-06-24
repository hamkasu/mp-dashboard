/**
 * Check Mohammad Hasan's bill count for data quality issues
 */
import { db } from '../server/db.js';
import { legislativeProposals, mps } from '../shared/schema.js';
import { eq, sql } from 'drizzle-orm';

(async () => {
  try {
    console.log('\n=== Mohammad Hasan Bill Analysis ===\n');

    // Find Mohammad Hasan
    const mohamadHasan = await db
      .select()
      .from(mps)
      .where(eq(mps.name, 'Mohamad Hasan'))
      .limit(1);

    if (!mohamadHasan.length) {
      console.log('❌ Mohammad Hasan not found in database');
      process.exit(0);
    }

    const mpId = mohamadHasan[0].id;
    console.log(`✓ Found: ${mohamadHasan[0].name} (ID: ${mpId})`);
    console.log(`  Party: ${mohamadHasan[0].party}`);
    console.log(`  State: ${mohamadHasan[0].state}\n`);

    // Get all bills for this MP
    const bills = await db
      .select()
      .from(legislativeProposals)
      .where(eq(legislativeProposals.mpId, mpId));

    console.log(`📊 Total Bills Count: ${bills.length}\n`);

    // Break down by status
    const byStatus: Record<string, number> = {};
    bills.forEach((bill: any) => {
      byStatus[bill.status] = (byStatus[bill.status] || 0) + 1;
    });

    console.log('Bills by Status:');
    Object.entries(byStatus)
      .sort((a: any, b: any) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });

    // Break down by type
    const byType: Record<string, number> = {};
    bills.forEach((bill: any) => {
      byType[bill.type] = (byType[bill.type] || 0) + 1;
    });

    console.log('\nBills by Type:');
    Object.entries(byType)
      .sort((a: any, b: any) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });

    // Date range
    const dates = bills.map((b: any) => new Date(b.dateProposed).getFullYear());
    const minYear = Math.min(...dates);
    const maxYear = Math.max(...dates);
    console.log(`\nDate Range: ${minYear} - ${maxYear}`);

    // Sample some recent bills
    console.log('\n✏️  Most Recent Bills:');
    const recent = [...bills]
      .sort((a: any, b: any) => new Date(b.dateProposed).getTime() - new Date(a.dateProposed).getTime())
      .slice(0, 5);

    recent.forEach((bill: any) => {
      console.log(`  - ${bill.title.substring(0, 70)}`);
      console.log(`    Type: ${bill.type}, Status: ${bill.status}, Date: ${new Date(bill.dateProposed).toLocaleDateString()}`);
    });

    // Compare with other top MPs
    console.log('\n=== Comparison with Other MPs ===\n');

    const mpBillCounts = await db
      .select({
        mpId: legislativeProposals.mpId,
        name: mps.name,
        party: mps.party,
        count: sql<number>`count(*)::int`,
      })
      .from(legislativeProposals)
      .innerJoin(mps, eq(legislativeProposals.mpId, mps.id))
      .groupBy(legislativeProposals.mpId, mps.name, mps.party)
      .orderBy(sql`count(*) DESC`)
      .limit(20);

    console.log('Top 20 MPs by Bill Count:');
    mpBillCounts.forEach((row: any, idx: number) => {
      const isTarget = row.mpId === mpId;
      const marker = isTarget ? '→ ' : '  ';
      const name = row.name.padEnd(40);
      const party = (row.party || '').padEnd(4);
      console.log(`${marker}${(idx + 1).toString().padStart(2)}. ${name} (${party}) - ${row.count} bills`);
    });

    // Check for potential duplicates or data issues
    console.log('\n=== Data Quality Checks ===\n');

    // Check for identical titles (potential duplicates)
    const titleCounts: Record<string, number> = {};
    bills.forEach((bill: any) => {
      titleCounts[bill.title] = (titleCounts[bill.title] || 0) + 1;
    });

    const duplicates = Object.entries(titleCounts).filter(([_, count]: any) => count > 1);
    if (duplicates.length > 0) {
      console.log(`⚠️  Found ${duplicates.length} potential duplicate titles:`);
      duplicates.slice(0, 5).forEach(([title, count]: any) => {
        console.log(`   - "${title.substring(0, 60)}" appears ${count} times`);
      });
    } else {
      console.log('✓ No duplicate bill titles found');
    }

    // Check for very similar titles
    console.log('\n📏 Bill Title Length Distribution:');
    const lengths = bills.map((b: any) => b.title.length);
    if (lengths.length > 0) {
      const avg = lengths.reduce((a: number, b: number) => a + b, 0) / lengths.length;
      console.log(`  Min: ${Math.min(...lengths)}, Max: ${Math.max(...lengths)}, Avg: ${avg.toFixed(0)}`);
    }

    // Summary
    console.log('\n=== Summary ===\n');
    console.log(`Mohammad Hasan has ${bills.length} bills in the database`);
    console.log(`Most are: ${Object.entries(byType)[0]?.[0] || 'N/A'}`);
    console.log(`Status: ${Object.entries(byStatus)[0]?.[0] || 'N/A'} (${Object.entries(byStatus)[0]?.[1] || 0})`);

    if (duplicates.length === 0) {
      console.log(`✓ No data quality issues detected`);
    } else {
      console.log(`⚠️  ${duplicates.length} potential issues found`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
})();
