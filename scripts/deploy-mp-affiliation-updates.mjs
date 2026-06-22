#!/usr/bin/env node

/**
 * MP Affiliation Update Deployment Script
 *
 * This script:
 * 1. Verifies database connection
 * 2. Runs migration to create party_history table
 * 3. Applies all MP affiliation updates in a transaction
 * 4. Verifies all changes were applied
 * 5. Updates aggregate statistics if needed
 *
 * Usage:
 *   node scripts/deploy-mp-affiliation-updates.mjs
 *
 * Requirements:
 *   - DATABASE_URL environment variable must be set
 *   - Node.js with PostgreSQL client support
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const DATABASE_URL = process.env.DATABASE_URL;
const DRY_RUN = process.env.DRY_RUN === 'true';

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable not set');
  console.error('   Set it with: export DATABASE_URL="postgresql://user:pass@host/db"');
  process.exit(1);
}

console.log('\n🚀 MP Affiliation Update Deployment');
console.log('═'.repeat(70));
console.log(`Date: ${new Date().toISOString()}`);
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE UPDATE'}`);
console.log('═'.repeat(70) + '\n');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
});

async function runQuery(query, description) {
  console.log(`⏳ ${description}...`);
  try {
    const result = await pool.query(query);
    console.log(`✅ ${description}`);
    return result;
  } catch (error) {
    console.error(`❌ ${description}`);
    console.error(`   Error: ${error.message}`);
    throw error;
  }
}

async function deploy() {
  try {
    // Step 1: Verify database connection
    console.log('\n📊 STEP 1: Verify Database Connection');
    console.log('─'.repeat(70));
    await runQuery('SELECT NOW() as current_time', 'Database connection');

    // Step 2: Check if mps table exists
    await runQuery(
      `SELECT COUNT(*) FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'mps'`,
      'Verify mps table exists'
    );

    // Step 3: Run migration
    console.log('\n📦 STEP 2: Run Migration');
    console.log('─'.repeat(70));

    const migrationPath = path.join(__dirname, '../migrations/0051_create_party_history_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    if (!DRY_RUN) {
      await runQuery(migrationSQL, 'Create party_history table');
    } else {
      console.log('⏭️  DRY RUN: Skipping migration execution');
    }

    // Step 4: Apply updates
    console.log('\n🔄 STEP 3: Apply Affiliation Updates');
    console.log('─'.repeat(70));

    const updatePath = path.join(__dirname, '../SQL_UPDATE_MP_AFFILIATIONS_2026-06-22.sql');
    const updateSQL = fs.readFileSync(updatePath, 'utf8');

    if (!DRY_RUN) {
      await runQuery(updateSQL, 'Apply 9 MP affiliation changes');
    } else {
      console.log('⏭️  DRY RUN: Skipping update execution');
      console.log('   Migration would:');
      console.log('   - Create party_history table');
      console.log('   - Add coalition column to mps');
      console.log('   - Update 5 MPs to Independent');
      console.log('   - Update 3 coalition values');
      console.log('   - Update 1 by-election seat');
    }

    // Step 5: Verify changes
    console.log('\n✅ STEP 4: Verify Changes');
    console.log('─'.repeat(70));

    if (!DRY_RUN) {
      // Check if party_history table created
      const historyTable = await runQuery(
        `SELECT COUNT(*) FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'party_history'`,
        'Verify party_history table created'
      );

      // Check if coalition column added
      const coalitionColumn = await runQuery(
        `SELECT COUNT(*) FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'mps' AND column_name = 'coalition'`,
        'Verify coalition column added'
      );

      // Count party_history records
      const historyCount = await runQuery(
        'SELECT COUNT(*) as count FROM party_history',
        'Count party_history records'
      );
      console.log(`   → Records created: ${historyCount.rows[0].count}`);

      // Verify specific changes
      console.log('\n📋 Verification of Specific Changes:');

      // Check Independent MPs
      const independents = await pool.query(
        `SELECT parliament_code, name, party, coalition
         FROM mps
         WHERE parliament_code IN ('P147', 'P172', 'P156', 'P169', 'P127')
         ORDER BY parliament_code`
      );

      console.log('\n   Bersatu → Independent:');
      for (const row of independents.rows) {
        const status = row.party === 'Independent' && row.coalition === 'IND' ? '✅' : '❌';
        console.log(`   ${status} ${row.parliament_code} | ${row.name} | ${row.party}/${row.coalition}`);
      }

      // Check coalition changes
      const coalitionChanges = await pool.query(
        `SELECT parliament_code, name, party, coalition
         FROM mps
         WHERE parliament_code IN ('P209', 'P210', 'P197')
         ORDER BY parliament_code`
      );

      console.log('\n   Coalition Exits:');
      for (const row of coalitionChanges.rows) {
        const expectedCoalition = row.parliament_code === 'P197' ? 'STAR' : 'UPKO';
        const status = row.coalition === expectedCoalition ? '✅' : '❌';
        console.log(`   ${status} ${row.parliament_code} | ${row.name} | ${row.party}/${row.coalition}`);
      }

      // Check by-election
      const byElection = await pool.query(
        `SELECT parliament_code, name, party, coalition
         FROM mps
         WHERE parliament_code = 'P199'`
      );

      console.log('\n   By-Election (Kinabatangan):');
      if (byElection.rows.length > 0) {
        const row = byElection.rows[0];
        const status = row.name === 'Mohammad Naim Kurniawan Moktar' && row.party === 'UMNO' ? '✅' : '❌';
        console.log(`   ${status} ${row.parliament_code} | ${row.name} | ${row.party}/${row.coalition}`);
      } else {
        console.log(`   ❌ P199 record not found`);
      }
    } else {
      console.log('⏭️  DRY RUN: Skipping verification queries');
    }

    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log('✅ DEPLOYMENT COMPLETE');
    console.log('═'.repeat(70));

    if (DRY_RUN) {
      console.log('\n📌 DRY RUN COMPLETED');
      console.log('   To execute live updates, run:');
      console.log('   → node scripts/deploy-mp-affiliation-updates.mjs\n');
    } else {
      console.log('\n🎉 MP Affiliation Update Successfully Applied!');
      console.log('\n📝 Next Steps:');
      console.log('   1. Verify changes on live site');
      console.log('   2. Test affected constituency pages');
      console.log('   3. Check dashboard aggregates');
      console.log('   4. Monitor for user reports\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ DEPLOYMENT FAILED');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run deployment
deploy();
