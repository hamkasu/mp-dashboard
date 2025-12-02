/**
 * Copyright by Calmic Sdn Bhd
 * 
 * Bills Scraper Service
 * Scrapes bill data from the Malaysian Parliament website
 * https://www.parlimen.gov.my/bills-dewan-rakyat.html?uweb=dr&
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import crypto from 'crypto';
import { getDb } from './db';
import { bills, billPdfFiles, type Bill, type InsertBill, type BillPdfFile } from '@shared/schema';
import { eq } from 'drizzle-orm';

// SECURITY NOTE: The Malaysian Parliament website (parlimen.gov.my) has SSL certificate
// validation issues in some environments. Since we are ONLY READING public government data
// (not transmitting sensitive information), we disable certificate validation for this
// specific scraper. This is acceptable because:
// 1. We're only downloading publicly available HTML
// 2. No user data or credentials are being transmitted
// 3. The data is already public on the parliament website
// This pattern is also used consistently by other scrapers in this codebase (hansard-scraper.ts)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

export interface ScrapedBill {
  id: string;
  title: string;
  billNumber?: string;
  introductionDate?: string;
  status: string;
  fullTextUrl?: string;
}

export interface BillWithPdf extends Bill {
  hasPdf: boolean;
}

export interface BillsResponse {
  bills: BillWithPdf[];
  scrapedAt: string;
  sourceUrl: string;
  error?: string;
}

/**
 * Convert a scraped bill to the BillWithPdf format
 */
function scrapedBillToBillWithPdf(bill: ScrapedBill, sourceUrl: string): BillWithPdf {
  return {
    id: bill.id,
    title: bill.title,
    billNumber: bill.billNumber || null,
    introductionDate: bill.introductionDate || null,
    status: bill.status,
    fullTextUrl: bill.fullTextUrl || null,
    sourceUrl,
    scrapedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    hasPdf: false,
  };
}

/**
 * Get all bills from the database with PDF status
 */
export async function getBillsFromDatabase(): Promise<BillWithPdf[]> {
  const db = getDb();
  if (!db) {
    console.log('[Bills] Database not available');
    return [];
  }
  
  try {
    const allBills = await db.select().from(bills);
    
    // Check which bills have PDFs
    const billsWithPdfStatus = await Promise.all(
      allBills.map(async (bill) => {
        const pdfFiles = await db.select({ id: billPdfFiles.id })
          .from(billPdfFiles)
          .where(eq(billPdfFiles.billId, bill.id))
          .limit(1);
        
        return {
          ...bill,
          hasPdf: pdfFiles.length > 0,
        };
      })
    );
    
    return billsWithPdfStatus;
  } catch (error) {
    console.error('[Bills] Error fetching from database:', error);
    return [];
  }
}

/**
 * Save a bill to the database
 */
export async function saveBillToDatabase(billData: InsertBill): Promise<Bill | null> {
  const db = getDb();
  if (!db) {
    console.log('[Bills] Database not available');
    return null;
  }
  
  try {
    const [savedBill] = await db.insert(bills).values(billData).returning();
    return savedBill;
  } catch (error) {
    console.error('[Bills] Error saving to database:', error);
    return null;
  }
}

/**
 * Update a bill in the database
 */
export async function updateBillInDatabase(billId: string, billData: Partial<InsertBill>): Promise<Bill | null> {
  const db = getDb();
  if (!db) {
    console.log('[Bills] Database not available');
    return null;
  }
  
  try {
    const [updatedBill] = await db.update(bills)
      .set({ ...billData, updatedAt: new Date() })
      .where(eq(bills.id, billId))
      .returning();
    return updatedBill;
  } catch (error) {
    console.error('[Bills] Error updating in database:', error);
    return null;
  }
}

/**
 * Download a PDF from a URL and save it to the database
 */
export async function downloadAndSavePdf(billId: string, pdfUrl: string, uploadedBy?: string): Promise<BillPdfFile | null> {
  const db = getDb();
  if (!db) {
    console.log('[Bills PDF] Database not available');
    return null;
  }
  
  try {
    console.log(`[Bills PDF] Downloading PDF for bill ${billId} from ${pdfUrl}`);
    
    const response = await axios.get(pdfUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/pdf,*/*',
      },
      timeout: 60000,
      httpsAgent,
    });
    
    const pdfBuffer = Buffer.from(response.data);
    const md5Hash = crypto.createHash('md5').update(pdfBuffer).digest('hex');
    
    // Extract filename from URL or use a default
    const urlPath = new URL(pdfUrl).pathname;
    const originalFilename = urlPath.split('/').pop() || `bill-${billId}.pdf`;
    
    const [savedPdf] = await db.insert(billPdfFiles).values({
      billId,
      originalFilename,
      fileSizeBytes: pdfBuffer.length,
      contentType: 'application/pdf',
      pdfData: pdfBuffer,
      md5Hash,
      uploadedBy,
      downloadedFromUrl: pdfUrl,
    }).returning();
    
    console.log(`[Bills PDF] Saved PDF for bill ${billId}: ${originalFilename} (${pdfBuffer.length} bytes)`);
    return savedPdf;
  } catch (error: any) {
    console.error(`[Bills PDF] Error downloading PDF for bill ${billId}:`, error.message);
    return null;
  }
}

/**
 * Get a PDF file by bill ID
 */
export async function getBillPdf(billId: string): Promise<BillPdfFile | null> {
  const db = getDb();
  if (!db) {
    console.log('[Bills PDF] Database not available');
    return null;
  }
  
  try {
    const [pdfFile] = await db.select()
      .from(billPdfFiles)
      .where(eq(billPdfFiles.billId, billId))
      .limit(1);
    
    return pdfFile || null;
  } catch (error) {
    console.error(`[Bills PDF] Error fetching PDF for bill ${billId}:`, error);
    return null;
  }
}

/**
 * Delete a bill and its PDF from the database
 */
export async function deleteBill(billId: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    console.log('[Bills] Database not available');
    return false;
  }
  
  try {
    await db.delete(bills).where(eq(bills.id, billId));
    return true;
  } catch (error) {
    console.error(`[Bills] Error deleting bill ${billId}:`, error);
    return false;
  }
}

/**
 * Scrapes bills from the Malaysian Parliament Dewan Rakyat bills page
 */
export async function scrapeBills(): Promise<BillsResponse> {
  const sourceUrl = 'https://www.parlimen.gov.my/bills-dewan-rakyat.html?uweb=dr&';
  const baseUrl = 'https://www.parlimen.gov.my';
  
  try {
    console.log('[Bills Scraper] Fetching bills from Parliament website...');
    
    const response = await axios.get(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5,ms;q=0.3',
        'Referer': 'https://www.parlimen.gov.my/',
      },
      timeout: 30000,
      httpsAgent,
    });

    const $ = cheerio.load(response.data);
    const scrapedBills: ScrapedBill[] = [];

    // Try to find bill data in table structures
    // The Parliament website typically uses tables to display bill information
    $('table tbody tr, table tr').each((index, element) => {
      const $row = $(element);
      const cells = $row.find('td');
      
      if (cells.length >= 2) {
        // Extract data from table cells
        const titleCell = $(cells[0]).text().trim() || $(cells[1]).text().trim();
        const dateCell = cells.length >= 3 ? $(cells[2]).text().trim() : '';
        const statusCell = cells.length >= 4 ? $(cells[3]).text().trim() : '';
        
        // Look for PDF or document links
        const linkElement = $row.find('a[href*=".pdf"], a[href*="bill"], a[href*="rang"]').first();
        const fullTextUrl = linkElement.length ? 
          (linkElement.attr('href')?.startsWith('http') ? 
            linkElement.attr('href') : 
            `${baseUrl}/${linkElement.attr('href')?.replace(/^\//, '')}`) 
          : undefined;

        // Extract bill number if present (e.g., D.R. 1/2024)
        const billNumberMatch = titleCell.match(/D\.?R\.?\s*\d+\/\d+/i) || 
                                titleCell.match(/Rang Undang-Undang\s+\d+/i);
        const billNumber = billNumberMatch ? billNumberMatch[0] : undefined;

        // Only add if we have a meaningful title
        if (titleCell && titleCell.length > 3 && !titleCell.toLowerCase().includes('bil') && !titleCell.match(/^\d+$/)) {
          scrapedBills.push({
            id: crypto.randomUUID(),
            title: titleCell,
            billNumber,
            introductionDate: dateCell || undefined,
            status: statusCell || 'Unknown',
            fullTextUrl,
          });
        }
      }
    });

    // Also try to find bills in div/list structures (alternative layouts)
    $('.bill-item, .rang-undang-undang, [class*="bill"], [class*="rang"]').each((index, element) => {
      const $item = $(element);
      const title = $item.find('.title, h3, h4, .nama, .tajuk').first().text().trim() || 
                    $item.find('a').first().text().trim();
      const date = $item.find('.date, .tarikh, .masa').first().text().trim();
      const status = $item.find('.status, .keadaan').first().text().trim();
      const link = $item.find('a[href*=".pdf"], a[href*="bill"]').first();
      const fullTextUrl = link.length ? 
        (link.attr('href')?.startsWith('http') ? 
          link.attr('href') : 
          `${baseUrl}/${link.attr('href')?.replace(/^\//, '')}`) 
        : undefined;

      if (title && title.length > 3) {
        // Check if this bill is already added (avoid duplicates)
        const exists = scrapedBills.some(b => b.title === title);
        if (!exists) {
          scrapedBills.push({
            id: crypto.randomUUID(),
            title,
            introductionDate: date || undefined,
            status: status || 'Unknown',
            fullTextUrl,
          });
        }
      }
    });

    // Filter out header rows and empty entries
    const filteredBills = scrapedBills.filter(bill => 
      bill.title && 
      bill.title.length > 5 &&
      !bill.title.toLowerCase().includes('tajuk') &&
      !bill.title.toLowerCase().includes('title') &&
      !bill.title.toLowerCase().includes('no.') &&
      !bill.title.match(/^bil\.?\s*$/i)
    );

    console.log(`[Bills Scraper] Successfully scraped ${filteredBills.length} bills`);

    // Convert to BillWithPdf format using helper function
    const billsWithPdfStatus = filteredBills.map(bill => scrapedBillToBillWithPdf(bill, sourceUrl));

    return {
      bills: billsWithPdfStatus,
      scrapedAt: new Date().toISOString(),
      sourceUrl,
    };

  } catch (error: any) {
    console.error('[Bills Scraper] Error scraping bills:', error.message);
    
    // Return error response
    return {
      bills: [],
      scrapedAt: new Date().toISOString(),
      sourceUrl,
      error: `Failed to scrape bills: ${error.message}`,
    };
  }
}

/**
 * Scrape bills and save new ones to the database
 */
export async function scrapeAndSaveBills(): Promise<{ saved: number; updated: number; errors: number }> {
  const result = await scrapeBills();
  const stats = { saved: 0, updated: 0, errors: 0 };
  
  if (result.error || result.bills.length === 0) {
    return stats;
  }
  
  const db = getDb();
  if (!db) {
    console.log('[Bills] Database not available for saving');
    return stats;
  }
  
  for (const bill of result.bills) {
    try {
      // Check if bill already exists by title
      const existing = await db.select()
        .from(bills)
        .where(eq(bills.title, bill.title))
        .limit(1);
      
      if (existing.length > 0) {
        // Update existing bill
        await db.update(bills)
          .set({
            status: bill.status,
            fullTextUrl: bill.fullTextUrl,
            updatedAt: new Date(),
          })
          .where(eq(bills.id, existing[0].id));
        stats.updated++;
      } else {
        // Insert new bill
        await db.insert(bills).values({
          title: bill.title,
          billNumber: bill.billNumber,
          introductionDate: bill.introductionDate,
          status: bill.status,
          fullTextUrl: bill.fullTextUrl,
          sourceUrl: result.sourceUrl,
        });
        stats.saved++;
      }
    } catch (error) {
      console.error(`[Bills] Error saving bill "${bill.title}":`, error);
      stats.errors++;
    }
  }
  
  console.log(`[Bills] Saved: ${stats.saved}, Updated: ${stats.updated}, Errors: ${stats.errors}`);
  return stats;
}
