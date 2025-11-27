/**
 * Copyright by Calmic Sdn Bhd
 *
 * Script to scrape bills from the Malaysian Parliament website
 * URL: https://www.parlimen.gov.my/bills-dewan-rakyat.html?uweb=dr&lang=en
 *
 * This script fetches bills information and saves them to the database.
 * It can be run manually when the Parliament website is accessible.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from '../server/db';
import { legislativeProposals, mps } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface ScrapedBill {
  title: string;
  billNumber?: string;
  dateProposed?: Date;
  status: string;
  type: string;
  pdfUrl?: string;
  description: string;
}

const PARLIAMENT_BILLS_URL = 'https://www.parlimen.gov.my/bills-dewan-rakyat.html?uweb=dr&lang=en';

/**
 * Scrape bills from the Parliament website
 */
async function scrapeBills(): Promise<ScrapedBill[]> {
  console.log('🔍 Fetching bills from Parliament website...');

  try {
    const response = await axios.get(PARLIAMENT_BILLS_URL, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    const $ = cheerio.load(response.data);
    const bills: ScrapedBill[] = [];

    // The actual selectors will need to be adjusted based on the website's HTML structure
    // This is a template that needs to be customized once we can access the site

    // Example selector - needs to be adjusted based on actual HTML structure
    $('.bill-item, .table tr, .bill-row').each((_, element) => {
      const $el = $(element);

      // Extract bill information
      // These selectors are placeholders and need to be adjusted
      const title = $el.find('.bill-title, td:nth-child(2), .title').text().trim();
      const billNumber = $el.find('.bill-number, td:nth-child(1), .number').text().trim();
      const status = $el.find('.bill-status, td:nth-child(4), .status').text().trim();
      const dateStr = $el.find('.bill-date, td:nth-child(3), .date').text().trim();
      const pdfLink = $el.find('a[href*=".pdf"], a.download').attr('href');

      if (title) {
        bills.push({
          title,
          billNumber: billNumber || undefined,
          dateProposed: dateStr ? parseDate(dateStr) : undefined,
          status: normalizeStatus(status),
          type: determineBillType(title),
          pdfUrl: pdfLink ? normalizePdfUrl(pdfLink) : undefined,
          description: title, // Can be enhanced with more details
        });
      }
    });

    console.log(`✅ Found ${bills.length} bills`);
    return bills;
  } catch (error) {
    console.error('❌ Error scraping bills:', error);
    if (axios.isAxiosError(error)) {
      console.error(`Status: ${error.response?.status}`);
      console.error(`Message: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Parse date string from various formats
 */
function parseDate(dateStr: string): Date | undefined {
  try {
    // Try various date formats
    // Adjust based on actual date format on the website
    const cleaned = dateStr.replace(/[^\d\/\-\s]/g, '').trim();
    if (!cleaned) return undefined;

    const date = new Date(cleaned);
    return isNaN(date.getTime()) ? undefined : date;
  } catch {
    return undefined;
  }
}

/**
 * Normalize bill status
 */
function normalizeStatus(status: string): string {
  const statusLower = status.toLowerCase();

  if (statusLower.includes('passed') || statusLower.includes('lulus')) {
    return 'Passed';
  } else if (statusLower.includes('pending') || statusLower.includes('menunggu')) {
    return 'Pending';
  } else if (statusLower.includes('withdrawn') || statusLower.includes('tarik')) {
    return 'Withdrawn';
  } else if (statusLower.includes('rejected') || statusLower.includes('tolak')) {
    return 'Rejected';
  } else if (statusLower.includes('progress') || statusLower.includes('proses')) {
    return 'In Progress';
  }

  return status || 'Unknown';
}

/**
 * Determine bill type from title
 */
function determineBillType(title: string): string {
  const titleLower = title.toLowerCase();

  if (titleLower.includes('amendment') || titleLower.includes('pindaan')) {
    return 'Amendment';
  } else if (titleLower.includes('finance') || titleLower.includes('kewangan')) {
    return 'Finance Bill';
  } else if (titleLower.includes('supply') || titleLower.includes('bekalan')) {
    return 'Supply Bill';
  }

  return 'Bill';
}

/**
 * Normalize PDF URL to absolute URL
 */
function normalizePdfUrl(url: string): string {
  if (url.startsWith('http')) {
    return url;
  }
  if (url.startsWith('/')) {
    return `https://www.parlimen.gov.my${url}`;
  }
  return `https://www.parlimen.gov.my/${url}`;
}

/**
 * Import bills to database
 */
async function importBills(bills: ScrapedBill[]) {
  console.log('💾 Importing bills to database...');

  // Get a default MP ID for bills without a specific sponsor
  // In a real scenario, you'd need to match bills to specific MPs
  const [defaultMp] = await db.select().from(mps).limit(1);

  if (!defaultMp) {
    throw new Error('No MPs found in database. Please import MPs first.');
  }

  let imported = 0;
  let skipped = 0;

  for (const bill of bills) {
    try {
      // Check if bill already exists by title
      const existing = await db
        .select()
        .from(legislativeProposals)
        .where(eq(legislativeProposals.title, bill.title))
        .limit(1);

      if (existing.length > 0) {
        console.log(`⏭️  Skipping existing bill: ${bill.title}`);
        skipped++;
        continue;
      }

      // Insert new bill
      await db.insert(legislativeProposals).values({
        mpId: defaultMp.id, // This should be matched to the actual MP if possible
        title: bill.title,
        type: bill.type,
        dateProposed: bill.dateProposed || new Date(),
        status: bill.status,
        description: bill.description,
        billNumber: bill.billNumber,
        hansardReference: bill.pdfUrl,
      });

      console.log(`✅ Imported: ${bill.title}`);
      imported++;
    } catch (error) {
      console.error(`❌ Error importing bill "${bill.title}":`, error);
    }
  }

  console.log(`\n📊 Import Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${bills.length}`);
}

/**
 * Export bills to JSON file for manual review
 */
async function exportBillsToJson(bills: ScrapedBill[], filename: string = 'parliament-bills.json') {
  const fs = await import('fs/promises');
  await fs.writeFile(filename, JSON.stringify(bills, null, 2));
  console.log(`📄 Bills exported to ${filename}`);
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Starting Parliament Bills Scraper\n');

    const bills = await scrapeBills();

    if (bills.length === 0) {
      console.log('⚠️  No bills found. The website structure may have changed.');
      console.log('   Please review the HTML structure and update the selectors.');
      return;
    }

    // Export to JSON for review
    await exportBillsToJson(bills);

    // Filter unpassed bills
    const unpassedBills = bills.filter(b =>
      b.status !== 'Passed' && b.status !== 'Withdrawn'
    );

    console.log(`\n📋 Bill Status Summary:`);
    console.log(`   Total Bills: ${bills.length}`);
    console.log(`   Unpassed Bills: ${unpassedBills.length}`);

    // Export unpassed bills separately
    if (unpassedBills.length > 0) {
      await exportBillsToJson(unpassedBills, 'parliament-bills-unpassed.json');
    }

    // Ask if user wants to import to database
    console.log('\n💡 To import these bills to the database, uncomment the importBills call below.');
    // await importBills(bills);

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { scrapeBills, importBills, exportBillsToJson };
