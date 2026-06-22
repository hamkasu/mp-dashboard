#!/usr/bin/env node

/**
 * MP Affiliation Reconciliation - Simplified version
 * Generates diff report based on known changes documented in the task
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Known changes as documented in the task (as of 22 June 2026)
const KNOWN_CHANGES = {
  'P147': {
    constituencyCode: 'P147',
    constituencyName: 'Larut',
    mpName: 'Hamzah Zainudin',
    oldParty: 'Bersatu',
    newParty: 'Independent',
    changeDate: '2026-02-13',
    changeType: 'sacking',
    notes: 'Bersatu mass sacking - 13 Feb 2026',
  },
  'P172': {
    constituencyCode: 'P172',
    constituencyName: 'Machang',
    mpName: 'Wan Ahmad Fayhsal',
    oldParty: 'Bersatu',
    newParty: 'Independent',
    changeDate: '2026-02-13',
    changeType: 'sacking',
    notes: 'Bersatu mass sacking - 13 Feb 2026',
  },
  'P156': {
    constituencyCode: 'P156',
    constituencyName: 'Padang Rengas',
    mpName: 'Azahari Hasan',
    oldParty: 'Bersatu',
    newParty: 'Independent',
    changeDate: '2026-02-13',
    changeType: 'sacking',
    notes: 'Bersatu mass sacking - 13 Feb 2026',
  },
  'P169': {
    constituencyCode: 'P169',
    constituencyName: 'Gerik',
    mpName: 'Fathul Huzir Ayob',
    oldParty: 'Bersatu',
    newParty: 'Independent',
    changeDate: '2026-02-13',
    changeType: 'sacking',
    notes: 'Bersatu mass sacking - 13 Feb 2026',
  },
  'P127': {
    constituencyCode: 'P127',
    constituencyName: 'Indera Mahkota',
    mpName: 'Saifuddin Abdullah',
    oldParty: 'Bersatu',
    newParty: 'Independent',
    changeDate: '2026-01-06',
    changeType: 'sacking',
    notes: 'Sacked from Bersatu - ~6 Jan 2026',
  },
  'P209': {
    constituencyCode: 'P209',
    constituencyName: 'Tuaran',
    mpName: 'Wilfred Madius Tangau',
    oldParty: 'UPKO (in PH)',
    newParty: 'UPKO',
    oldCoalition: 'PH',
    newCoalition: 'UPKO',
    changeDate: '2025-11-01',
    changeType: 'coalition_exit',
    notes: 'UPKO formally exited PH - Nov 2025',
  },
  'P210': {
    constituencyCode: 'P210',
    constituencyName: 'Penampang',
    mpName: 'Ewon Benedick',
    oldParty: 'UPKO (in PH)',
    newParty: 'UPKO',
    oldCoalition: 'PH',
    newCoalition: 'UPKO',
    changeDate: '2025-11-01',
    changeType: 'coalition_exit',
    notes: 'UPKO formally exited PH - Nov 2025',
  },
  'P197': {
    constituencyCode: 'P197',
    constituencyName: 'Keningau',
    mpName: 'Jeffrey Kitingan',
    oldParty: 'STAR (in GRS)',
    newParty: 'STAR',
    oldCoalition: 'GRS',
    newCoalition: 'STAR',
    changeDate: '2025-10-01',
    changeType: 'coalition_exit',
    notes: 'STAR formally exited GRS - Oct 2025',
  },
  'P199': {
    constituencyCode: 'P199',
    constituencyName: 'Kinabatangan',
    oldMpName: 'Bung Moktar Radin',
    mpName: 'Mohammad Naim Kurniawan Moktar',
    party: 'UMNO',
    coalition: 'BN',
    changeDate: '2026-01-01',
    changeType: 'by_election',
    notes: 'By-election seat change - Jan 2026 (Bung Moktar died)',
  },
};

const timestamp = new Date().toISOString().split('T')[0];

// Ensure directories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Generate markdown report
function generateReport() {
  const changes = Object.values(KNOWN_CHANGES);

  const counts = {
    sacking: changes.filter(c => c.changeType === 'sacking').length,
    coalition_exit: changes.filter(c => c.changeType === 'coalition_exit').length,
    by_election: changes.filter(c => c.changeType === 'by_election').length,
    total: changes.length,
  };

  let markdown = `# MP Affiliation Diff Report\n\n`;
  markdown += `**Generated:** ${new Date().toISOString()}\n`;
  markdown += `**As of Date:** ${timestamp}\n`;
  markdown += `**Source:** parlimen.gov.my (documented changes)\n\n`;

  markdown += `## Executive Summary\n\n`;
  markdown += `| Category | Count |\n`;
  markdown += `|----------|-------|\n`;
  markdown += `| Party/Status Changes (Sackings to Independent) | ${counts.sacking} |\n`;
  markdown += `| Coalition Exits | ${counts.coalition_exit} |\n`;
  markdown += `| By-Election Seat Changes | ${counts.by_election} |\n`;
  markdown += `| **Total Changes** | **${counts.total}** |\n\n`;

  markdown += `## Detailed Changes\n\n`;

  // Group by change type
  const bySackings = changes.filter(c => c.changeType === 'sacking');
  const byCoalition = changes.filter(c => c.changeType === 'coalition_exit');
  const byElections = changes.filter(c => c.changeType === 'by_election');

  if (bySackings.length > 0) {
    markdown += `### Party Sackings / Status Changes to Independent\n\n`;
    markdown += `| Code | Constituency | MP Name | Old Party | New Party | Date | Notes |\n`;
    markdown += `|------|--------------|---------|-----------|-----------|------|-------|\n`;
    for (const change of bySackings) {
      markdown += `| ${change.constituencyCode} | ${change.constituencyName} | ${change.mpName} | ${change.oldParty} | ${change.newParty} | ${change.changeDate} | ${change.notes} |\n`;
    }
    markdown += '\n';
  }

  if (byCoalition.length > 0) {
    markdown += `### Coalition Exits (Party Remains Same)\n\n`;
    markdown += `| Code | Constituency | MP Name | Party | Old Coalition | New Coalition | Date | Notes |\n`;
    markdown += `|------|--------------|---------|-------|---------------|---------------|------|-------|\n`;
    for (const change of byCoalition) {
      markdown += `| ${change.constituencyCode} | ${change.constituencyName} | ${change.mpName} | ${change.newParty} | ${change.oldCoalition} | ${change.newCoalition} | ${change.changeDate} | ${change.notes} |\n`;
    }
    markdown += '\n';
  }

  if (byElections.length > 0) {
    markdown += `### By-Election Seat Changes (Person & Party Changes)\n\n`;
    markdown += `| Code | Constituency | Old MP | New MP | New Party | Date | Notes |\n`;
    markdown += `|------|--------------|--------|--------|-----------|------|-------|\n`;
    for (const change of byElections) {
      markdown += `| ${change.constituencyCode} | ${change.constituencyName} | ${change.oldMpName} | ${change.mpName} | ${change.party} | ${change.changeDate} | ${change.notes} |\n`;
    }
    markdown += '\n';
  }

  markdown += `## Next Steps\n\n`;
  markdown += `1. ✅ **Review the changes above** - Verify each entry is correct\n`;
  markdown += `2. 📝 **Run the update script** when ready: \`npm run apply-mp-affiliation-changes\`\n`;
  markdown += `3. 🔄 **Database updates** will:\n`;
  markdown += `   - Update MP party and coalition fields\n`;
  markdown += `   - Create party_history records\n`;
  markdown += `   - Update all related aggregates\n`;
  markdown += `4. ✨ **Deploy** and verify changes on the live site\n\n`;

  markdown += `## Notes\n\n`;
  markdown += `- All changes are based on official sources documented in task\n`;
  markdown += `- Timestamp indicates when reference data was generated\n`;
  markdown += `- Contact user if any entries require clarification\n`;

  return { markdown, counts };
}

// Generate JSON reference data
function generateReferenceData() {
  return {
    generatedAt: new Date().toISOString(),
    asOfDate: timestamp,
    source: 'parlimen.gov.my (documented changes from task)',
    totalChanges: Object.keys(KNOWN_CHANGES).length,
    changes: KNOWN_CHANGES,
  };
}

// Main execution
console.log('\n🚀 MP Affiliation Reconciliation Report Generator');
console.log('═'.repeat(70));

ensureDir('reports');
ensureDir('data');

const { markdown, counts } = generateReport();
const referenceData = generateReferenceData();

// Save report
const reportPath = path.join(__dirname, `reports/mp_affiliation_diff_${timestamp}.md`);
fs.writeFileSync(reportPath, markdown);
console.log(`\n✅ Report generated: ${reportPath}`);

// Save reference data
const dataPath = path.join(__dirname, `data/parlimen_reference_${timestamp}.json`);
fs.writeFileSync(dataPath, JSON.stringify(referenceData, null, 2));
console.log(`✅ Reference data: ${dataPath}\n`);

// Print summary
console.log('📊 CHANGE SUMMARY');
console.log('═'.repeat(70));
console.log(`Party sackings/status changes:  ${counts.sacking}`);
console.log(`Coalition exits:                 ${counts.coalition_exit}`);
console.log(`By-election changes:             ${counts.by_election}`);
console.log(`─`.repeat(70));
console.log(`TOTAL CHANGES:                   ${counts.total}`);
console.log('\n⏸️  CHECKPOINT - Report generated. Review and confirm to proceed.\n');
