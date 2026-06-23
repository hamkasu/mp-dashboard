/**
 * Test script to verify the ROI score fix
 * Shows distribution of ROI scores and grades after the fix
 */
import { updateAllReportCards, getReportCardsWithDetails } from '../server/services/report-card-service.js';

(async () => {
  console.log('Testing ROI Score Fix...\n');

  try {
    // Regenerate all report cards with the fixed ROI calculation
    console.log('Regenerating report cards with fixed ROI scoring...');
    const result = await updateAllReportCards();
    console.log(`✓ Report cards updated: ${result.updated} updated, ${result.created} created\n`);

    // Fetch report cards
    const reportCards = await getReportCardsWithDetails();

    // Analyze ROI distribution
    console.log('===== ROI SCORE ANALYSIS =====\n');

    const roiScores = reportCards.map(card => card.roiScore);
    const avgRoi = Math.round(roiScores.reduce((a, b) => a + b, 0) / roiScores.length);
    const minRoi = Math.min(...roiScores);
    const maxRoi = Math.max(...roiScores);

    console.log(`Total MPs: ${reportCards.length}`);
    console.log(`Average ROI Score: ${avgRoi}`);
    console.log(`Min ROI Score: ${minRoi}`);
    console.log(`Max ROI Score: ${maxRoi}`);
    console.log('');

    // Grade distribution
    const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    reportCards.forEach(card => {
      gradeDistribution[card.roiGrade] = (gradeDistribution[card.roiGrade] || 0) + 1;
    });

    console.log('ROI Grade Distribution:');
    console.log(`  A: ${gradeDistribution.A} (${Math.round(gradeDistribution.A / reportCards.length * 100)}%)`);
    console.log(`  B: ${gradeDistribution.B} (${Math.round(gradeDistribution.B / reportCards.length * 100)}%)`);
    console.log(`  C: ${gradeDistribution.C} (${Math.round(gradeDistribution.C / reportCards.length * 100)}%)`);
    console.log(`  D: ${gradeDistribution.D} (${Math.round(gradeDistribution.D / reportCards.length * 100)}%)`);
    console.log(`  F: ${gradeDistribution.F} (${Math.round(gradeDistribution.F / reportCards.length * 100)}%)`);
    console.log('');

    // Show top and bottom performers
    const sorted = [...reportCards].sort((a, b) => b.roiScore - a.roiScore);

    console.log('===== TOP 5 ROI PERFORMERS =====');
    for (let i = 0; i < Math.min(5, sorted.length); i++) {
      const card = sorted[i];
      console.log(`${i + 1}. ${card.mp.name} (${card.mp.party})`);
      console.log(`   ROI Score: ${card.roiScore} (Grade: ${card.roiGrade})`);
      console.log(`   Output: ${card.totalSpeeches} speeches, ${card.billsRaised} bills, ${card.questionsAsked} questions`);
      console.log(`   Annual Allowance: RM ${(card.annualAllowance || 0).toLocaleString()}`);
      console.log('');
    }

    console.log('===== BOTTOM 5 ROI PERFORMERS =====');
    for (let i = 0; i < Math.min(5, sorted.length); i++) {
      const card = sorted[sorted.length - 1 - i];
      console.log(`${i + 1}. ${card.mp.name} (${card.mp.party})`);
      console.log(`   ROI Score: ${card.roiScore} (Grade: ${card.roiGrade})`);
      console.log(`   Output: ${card.totalSpeeches} speeches, ${card.billsRaised} bills, ${card.questionsAsked} questions`);
      console.log(`   Annual Allowance: RM ${(card.annualAllowance || 0).toLocaleString()}`);
      console.log('');
    }

    // Verify fix: no more all A grades
    const allAGrades = reportCards.filter(card => card.roiGrade === 'A');
    const allSameScore = reportCards.every(card => card.roiScore === reportCards[0].roiScore);

    if (allAGrades.length === reportCards.length) {
      console.log('⚠️  WARNING: All MPs still have A grade - ROI fix may not be applied!');
    } else if (allSameScore) {
      console.log('⚠️  WARNING: All MPs have the same ROI score - calculation may be broken!');
    } else {
      console.log('✓ ROI scores are properly distributed across grades!');
      console.log(`✓ Fix verified: ${gradeDistribution.A} A grades, ${reportCards.length - gradeDistribution.A} non-A grades`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
