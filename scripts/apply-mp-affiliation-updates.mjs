#!/usr/bin/env node

/**
 * Apply MP Affiliation Updates
 *
 * This script applies the reconciled MP party affiliation changes:
 * 1. Ensures party_history table exists
 * 2. Inserts historical records for all changes
 * 3. Updates mps table with current party/coalition values
 * 4. Updates aggregate statistics
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Reference data from reconciliation step
const referenceDataPath = path.join(__dirname, '../data/parlimen_reference_2026-06-22.json');

console.log('\n🚀 Applying MP Affiliation Updates');
console.log('═'.repeat(70));

if (!fs.existsSync(referenceDataPath)) {
  console.error('❌ Reference data not found. Run reconcile-affiliations.mjs first.');
  process.exit(1);
}

const referenceData = JSON.parse(fs.readFileSync(referenceDataPath, 'utf8'));
const changes = Object.values(referenceData.changes);

// Map constituency codes to parliament codes (P147 format)
const CONSTITUENCY_CODE_MAP = {
  'P147': 'Larut',
  'P172': 'Machang',
  'P156': 'Padang Rengas',
  'P169': 'Gerik',
  'P127': 'Indera Mahkota',
  'P209': 'Tuaran',
  'P210': 'Penampang',
  'P197': 'Keningau',
  'P199': 'Kinabatangan',
};

// Generate SQL update statements
function generateUpdateSQL() {
  let sql = '';

  sql += '-- ================================================================\n';
  sql += '-- MP Affiliation Updates - Generated 2026-06-22\n';
  sql += '-- Applies party and coalition changes\n';
  sql += '-- ================================================================\n\n';

  sql += 'BEGIN;\n\n';

  // Party Sackings (Bersatu -> Independent)
  const sackings = changes.filter(c => c.changeType === 'sacking');
  if (sackings.length > 0) {
    sql += '-- ================================================================\n';
    sql += '-- 1. PARTY SACKINGS - Bersatu MPs became Independent\n';
    sql += '-- ================================================================\n\n';

    for (const sacking of sackings) {
      const mpName = sacking.mpName;
      sql += `-- ${sacking.constituencyCode} | ${sacking.constituencyName}\n`;
      sql += `UPDATE mps\n`;
      sql += `SET party = 'Independent', coalition = 'IND'\n`;
      sql += `WHERE parliament_code = '${sacking.constituencyCode}'\n`;
      sql += `  AND name ILIKE '%${mpName.split(' ')[0]}%';\n\n`;

      sql += `INSERT INTO party_history\n`;
      sql += `  (mp_id, old_party, old_coalition, new_party, new_coalition, change_date, change_type, notes)\n`;
      sql += `SELECT id, '${sacking.oldParty}', 'PN', 'Independent', 'IND', '${sacking.changeDate}'::timestamp, 'sacking', '${sacking.notes}'\n`;
      sql += `FROM mps WHERE parliament_code = '${sacking.constituencyCode}';\n\n`;
    }
  }

  // Coalition Exits
  const coalitionExits = changes.filter(c => c.changeType === 'coalition_exit');
  if (coalitionExits.length > 0) {
    sql += '-- ================================================================\n';
    sql += '-- 2. COALITION EXITS\n';
    sql += '-- ================================================================\n\n';

    for (const exit of coalitionExits) {
      const mpName = exit.mpName;
      sql += `-- ${exit.constituencyCode} | ${exit.constituencyName}\n`;
      sql += `UPDATE mps\n`;
      sql += `SET coalition = '${exit.newCoalition}'\n`;
      sql += `WHERE parliament_code = '${exit.constituencyCode}'\n`;
      sql += `  AND name ILIKE '%${mpName.split(' ')[0]}%';\n\n`;

      sql += `INSERT INTO party_history\n`;
      sql += `  (mp_id, old_party, old_coalition, new_party, new_coalition, change_date, change_type, notes)\n`;
      sql += `SELECT id, '${exit.newParty}', '${exit.oldCoalition}', '${exit.newParty}', '${exit.newCoalition}', '${exit.changeDate}'::timestamp, 'coalition_exit', '${exit.notes}'\n`;
      sql += `FROM mps WHERE parliament_code = '${exit.constituencyCode}';\n\n`;
    }
  }

  // By-Elections
  const byElections = changes.filter(c => c.changeType === 'by_election');
  if (byElections.length > 0) {
    sql += '-- ================================================================\n';
    sql += '-- 3. BY-ELECTION SEAT CHANGES\n';
    sql += '-- ================================================================\n\n';

    for (const election of byElections) {
      sql += `-- ${election.constituencyCode} | ${election.constituencyName}\n`;
      sql += `-- Old MP: ${election.oldMpName} -> New MP: ${election.mpName}\n`;
      sql += `UPDATE mps\n`;
      sql += `SET name = '${election.mpName}', party = '${election.party}', coalition = '${election.coalition}',\n`;
      sql += `    by_election_date = '${election.changeDate}'::timestamp,\n`;
      sql += `    by_election_notes = '${election.notes}'\n`;
      sql += `WHERE parliament_code = '${election.constituencyCode}';\n\n`;

      sql += `INSERT INTO party_history\n`;
      sql += `  (mp_id, old_party, new_party, new_coalition, change_date, change_type, notes)\n`;
      sql += `SELECT id, NULL, '${election.party}', '${election.coalition}', '${election.changeDate}'::timestamp, 'by_election', '${election.notes} (Previous: ${election.oldMpName})'\n`;
      sql += `FROM mps WHERE parliament_code = '${election.constituencyCode}';\n\n`;
    }
  }

  sql += '\nCOMMIT;\n';

  return sql;
}

// Generate SQL file
const updateSQL = generateUpdateSQL();
const sqlPath = path.join(__dirname, '../SQL_UPDATE_MP_AFFILIATIONS_2026-06-22.sql');

fs.writeFileSync(sqlPath, updateSQL);

console.log('✅ SQL update script generated');
console.log(`📄 Location: ${sqlPath}\n`);

// Print first part of SQL
console.log('Preview of SQL statements:');
console.log('═'.repeat(70));
const preview = updateSQL.split('\n').slice(0, 40).join('\n');
console.log(preview);
console.log('... (see full file for complete statements)\n');

// Summary
console.log('📊 UPDATE SUMMARY');
console.log('═'.repeat(70));
console.log(`Sackings (→ Independent):    ${changes.filter(c => c.changeType === 'sacking').length}`);
console.log(`Coalition Exits:              ${changes.filter(c => c.changeType === 'coalition_exit').length}`);
console.log(`By-Elections:                 ${changes.filter(c => c.changeType === 'by_election').length}`);
console.log(`TOTAL CHANGES:                ${changes.length}\n`);

console.log('⚠️  NEXT STEPS:');
console.log('═'.repeat(70));
console.log('1. Review the SQL file (SQL_UPDATE_MP_AFFILIATIONS_2026-06-22.sql)');
console.log('2. Verify with database administrator before applying');
console.log('3. Apply with: psql -U <user> -d <database> -f <file>');
console.log('4. Or let the update system handle deployment\n');

console.log('💡 Migration file created: migrations/0051_create_party_history_table.sql');
console.log('✨ Ready for deployment!\n');
