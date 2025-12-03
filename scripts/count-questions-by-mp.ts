/**
 * Script to count oral questions asked by each MP/constituency
 * and update their legislative activity stats
 */

import { getDb } from '../server/db';
import { parliamentaryOralAnswers, mps } from '@shared/schema';
import { eq, count, sql } from 'drizzle-orm';

async function main() {
  console.log('📊 Counting Questions by MP and Constituency\n');

  const db = getDb();
  if (!db) {
    console.error('❌ Database not available');
    process.exit(1);
  }

  try {
    // Get all oral answers with questioner information
    const allAnswers = await db.select().from(parliamentaryOralAnswers);

    console.log(`📄 Total oral answer records: ${allAnswers.length}\n`);

    // Filter only those with questioner data
    const answersWithQuestioner = allAnswers.filter(a =>
      a.questionerName || a.questionerConstituency
    );

    console.log(`✅ Records with questioner data: ${answersWithQuestioner.length}\n`);

    // Group by MP
    const questionsByMp = new Map<string, number>();
    const questionsByConstituency = new Map<string, number>();
    const questionersByMp = new Map<string, Set<string>>();

    for (const answer of answersWithQuestioner) {
      if (answer.questionerMpId) {
        questionsByMp.set(
          answer.questionerMpId,
          (questionsByMp.get(answer.questionerMpId) || 0) + 1
        );
      }

      if (answer.questionerConstituency) {
        const constituency = answer.questionerConstituency.trim();
        questionsByConstituency.set(
          constituency,
          (questionsByConstituency.get(constituency) || 0) + 1
        );

        if (!questionersByMp.has(constituency)) {
          questionersByMp.set(constituency, new Set());
        }
        if (answer.questionerName) {
          questionersByMp.get(constituency)!.add(answer.questionerName);
        }
      }
    }

    // Get all MPs
    const allMps = await db.select().from(mps);

    console.log('📊 Questions by Constituency:\n');
    console.log('─'.repeat(100));
    console.log('Constituency                           Questions    MPs');
    console.log('─'.repeat(100));

    // Sort by question count
    const sortedConstituencies = Array.from(questionsByConstituency.entries())
      .sort((a, b) => b[1] - a[1]);

    for (const [constituency, count] of sortedConstituencies) {
      const questioners = questionersByMp.get(constituency) || new Set();
      const mpNames = Array.from(questioners).join(', ');
      console.log(`${constituency.padEnd(40)} ${String(count).padStart(5)}    ${mpNames}`);
    }

    console.log('─'.repeat(100));

    // Show top questioners by MP ID
    console.log('\n📊 Top Questioners by MP:\n');
    console.log('─'.repeat(80));

    const sortedMps = Array.from(questionsByMp.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20); // Top 20

    for (const [mpId, count] of sortedMps) {
      const mp = allMps.find(m => m.id === mpId);
      if (mp) {
        console.log(`${mp.name.padEnd(50)} [${mp.constituency.padEnd(20)}] ${String(count).padStart(3)} questions`);
      }
    }

    console.log('─'.repeat(80));

    // Summary statistics
    console.log('\n' + '='.repeat(80));
    console.log('📈 SUMMARY STATISTICS');
    console.log('='.repeat(80));
    console.log(`Total oral answers with questioner:  ${answersWithQuestioner.length}`);
    console.log(`Unique constituencies:               ${questionsByConstituency.size}`);
    console.log(`MPs with questions:                  ${questionsByMp.size}`);
    console.log(`Average questions per constituency:  ${(answersWithQuestioner.length / questionsByConstituency.size).toFixed(1)}`);
    console.log('='.repeat(80));

    // Show constituencies with no questions
    const constituenciesWithQuestions = new Set(questionsByConstituency.keys());
    const constituenciesWithoutQuestions = allMps
      .map(mp => mp.constituency)
      .filter(c => !constituenciesWithQuestions.has(c));

    if (constituenciesWithoutQuestions.length > 0) {
      console.log(`\n⚠️  ${constituenciesWithoutQuestions.length} constituencies have no recorded questions`);
      console.log('   (This is normal if not all PDFs have been processed yet)');
    }

    console.log('\n✨ Analysis complete!\n');
    console.log('💡 Note: To display these counts on MP profiles, we need to:');
    console.log('   1. Create a view or aggregation query');
    console.log('   2. Update the MP profile page to fetch oral question counts');
    console.log('   3. Add a field to track this data\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
