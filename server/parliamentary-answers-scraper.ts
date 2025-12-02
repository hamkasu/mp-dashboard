/**
 * Copyright by Calmic Sdn Bhd
 *
 * Parliamentary Oral Answers Scraper Service
 * Scrapes jawapan lisan (oral answers) data from the Malaysian Parliament website
 * https://www.parlimen.gov.my/jawapan-lisan-dr.html?uweb=dr&
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import crypto from 'crypto';
import { getDb } from './db';
import {
  parliamentaryOralAnswers,
  parliamentaryAnswerPdfFiles,
  type ParliamentaryOralAnswer,
  type InsertParliamentaryOralAnswer,
  type ParliamentaryAnswerPdfFile,
  type Mp,
  mps
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import { ParliamentaryAnswersPdfParser } from './parliamentary-answers-pdf-parser';

// SECURITY NOTE: The Malaysian Parliament website (parlimen.gov.my) has SSL certificate
// validation issues in some environments. Since we are ONLY READING public government data
// (not transmitting sensitive information), we disable certificate validation for this
// specific scraper. This is acceptable because:
// 1. We're only downloading publicly available HTML
// 2. No user data or credentials are being transmitted
// 3. The data is already public on the parliament website
// This pattern is also used consistently by other scrapers in this codebase (hansard-scraper.ts, bills-scraper.ts)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

export interface ScrapedAnswer {
  id: string;
  questionNumber?: string;
  title: string;
  questionerName?: string;
  answererName?: string;
  answererMinistry?: string;
  dateAsked?: string;
  status: string;
  questionText?: string;
  answerText?: string;
  fullTextUrl?: string;
}

export interface AnswerWithPdf extends ParliamentaryOralAnswer {
  hasPdf: boolean;
}

export interface AnswersResponse {
  answers: AnswerWithPdf[];
  scrapedAt: string;
  sourceUrl: string;
  error?: string;
}

/**
 * Convert a scraped answer to the AnswerWithPdf format
 */
function scrapedAnswerToAnswerWithPdf(answer: ScrapedAnswer, sourceUrl: string): AnswerWithPdf {
  return {
    id: answer.id,
    questionNumber: answer.questionNumber || null,
    title: answer.title,
    questionerName: answer.questionerName || null,
    questionerMpId: null,
    answererName: answer.answererName || null,
    answererMinistry: answer.answererMinistry || null,
    dateAsked: answer.dateAsked || null,
    status: answer.status,
    questionText: answer.questionText || null,
    answerText: answer.answerText || null,
    fullTextUrl: answer.fullTextUrl || null,
    sourceUrl,
    scrapedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    hasPdf: false,
  };
}

/**
 * Get all parliamentary oral answers from the database with PDF status
 */
export async function getAnswersFromDatabase(): Promise<AnswerWithPdf[]> {
  const db = getDb();
  if (!db) {
    console.log('[Parliamentary Answers] Database not available');
    return [];
  }

  try {
    const allAnswers = await db.select().from(parliamentaryOralAnswers);

    // Check which answers have PDFs
    const answersWithPdfStatus = await Promise.all(
      allAnswers.map(async (answer) => {
        const pdfFiles = await db.select({ id: parliamentaryAnswerPdfFiles.id })
          .from(parliamentaryAnswerPdfFiles)
          .where(eq(parliamentaryAnswerPdfFiles.answerId, answer.id))
          .limit(1);

        return {
          ...answer,
          hasPdf: pdfFiles.length > 0,
        };
      })
    );

    return answersWithPdfStatus;
  } catch (error) {
    console.error('[Parliamentary Answers] Error fetching from database:', error);
    return [];
  }
}

/**
 * Save a parliamentary answer to the database
 */
export async function saveAnswerToDatabase(answerData: InsertParliamentaryOralAnswer): Promise<ParliamentaryOralAnswer | null> {
  const db = getDb();
  if (!db) {
    console.log('[Parliamentary Answers] Database not available');
    return null;
  }

  try {
    const [savedAnswer] = await db.insert(parliamentaryOralAnswers).values(answerData).returning();
    return savedAnswer;
  } catch (error) {
    console.error('[Parliamentary Answers] Error saving to database:', error);
    return null;
  }
}

/**
 * Update a parliamentary answer in the database
 */
export async function updateAnswerInDatabase(answerId: string, answerData: Partial<InsertParliamentaryOralAnswer>): Promise<ParliamentaryOralAnswer | null> {
  const db = getDb();
  if (!db) {
    console.log('[Parliamentary Answers] Database not available');
    return null;
  }

  try {
    const [updatedAnswer] = await db.update(parliamentaryOralAnswers)
      .set({ ...answerData, updatedAt: new Date() })
      .where(eq(parliamentaryOralAnswers.id, answerId))
      .returning();
    return updatedAnswer;
  } catch (error) {
    console.error('[Parliamentary Answers] Error updating in database:', error);
    return null;
  }
}

/**
 * Download a PDF from a URL and save it to the database
 */
export async function downloadAndSaveAnswerPdf(answerId: string, pdfUrl: string, uploadedBy?: string): Promise<ParliamentaryAnswerPdfFile | null> {
  const db = getDb();
  if (!db) {
    console.log('[Parliamentary Answers PDF] Database not available');
    return null;
  }

  try {
    console.log(`[Parliamentary Answers PDF] Downloading PDF for answer ${answerId} from ${pdfUrl}`);

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
    const originalFilename = urlPath.split('/').pop() || `answer-${answerId}.pdf`;

    const [savedPdf] = await db.insert(parliamentaryAnswerPdfFiles).values({
      answerId,
      originalFilename,
      fileSizeBytes: pdfBuffer.length,
      contentType: 'application/pdf',
      pdfData: pdfBuffer,
      md5Hash,
      uploadedBy,
      downloadedFromUrl: pdfUrl,
    }).returning();

    console.log(`[Parliamentary Answers PDF] Saved PDF for answer ${answerId}: ${originalFilename} (${pdfBuffer.length} bytes)`);
    return savedPdf;
  } catch (error: any) {
    console.error(`[Parliamentary Answers PDF] Error downloading PDF for answer ${answerId}:`, error.message);
    return null;
  }
}

/**
 * Get a PDF file by answer ID
 */
export async function getAnswerPdf(answerId: string): Promise<ParliamentaryAnswerPdfFile | null> {
  const db = getDb();
  if (!db) {
    console.log('[Parliamentary Answers PDF] Database not available');
    return null;
  }

  try {
    const [pdfFile] = await db.select()
      .from(parliamentaryAnswerPdfFiles)
      .where(eq(parliamentaryAnswerPdfFiles.answerId, answerId))
      .limit(1);

    return pdfFile || null;
  } catch (error) {
    console.error(`[Parliamentary Answers PDF] Error fetching PDF for answer ${answerId}:`, error);
    return null;
  }
}

/**
 * Delete a parliamentary answer and its PDF from the database
 */
export async function deleteAnswer(answerId: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    console.log('[Parliamentary Answers] Database not available');
    return false;
  }

  try {
    await db.delete(parliamentaryOralAnswers).where(eq(parliamentaryOralAnswers.id, answerId));
    return true;
  } catch (error) {
    console.error(`[Parliamentary Answers] Error deleting answer ${answerId}:`, error);
    return false;
  }
}

/**
 * Scrapes parliamentary oral answers from the Malaysian Parliament website
 */
export async function scrapeParliamentaryAnswers(): Promise<AnswersResponse> {
  const sourceUrl = 'https://www.parlimen.gov.my/jawapan-lisan-dr.html?uweb=dr&';
  const baseUrl = 'https://www.parlimen.gov.my';

  try {
    console.log('[Parliamentary Answers Scraper] Fetching oral answers from Parliament website...');

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
    const scrapedAnswers: ScrapedAnswer[] = [];

    // Try to find answer data in table structures
    // The Parliament website typically uses tables to display oral answer information
    $('table tbody tr, table tr').each((index, element) => {
      const $row = $(element);
      const cells = $row.find('td');

      if (cells.length >= 2) {
        // Extract data from table cells
        // Common patterns: Question No | Title | Questioner | Date | Status
        const questionNumberCell = $(cells[0]).text().trim();
        const titleCell = $(cells[1]).text().trim() || $(cells[2]).text().trim();
        const questionerCell = cells.length >= 3 ? $(cells[2]).text().trim() : '';
        const dateCell = cells.length >= 4 ? $(cells[3]).text().trim() : '';
        const statusCell = cells.length >= 5 ? $(cells[4]).text().trim() : '';

        // Look for PDF or document links
        const linkElement = $row.find('a[href*=".pdf"], a[href*="jawapan"], a[href*="soalan"]').first();
        const fullTextUrl = linkElement.length ?
          (linkElement.attr('href')?.startsWith('http') ?
            linkElement.attr('href') :
            `${baseUrl}/${linkElement.attr('href')?.replace(/^\//, '')}`)
          : undefined;

        // Extract question number if present (e.g., S.1, S.123)
        const questionNumberMatch = questionNumberCell.match(/S\.?\s*\d+/i) ||
                                     titleCell.match(/S\.?\s*\d+/i);
        const questionNumber = questionNumberMatch ? questionNumberMatch[0] : questionNumberCell;

        // Only add if we have a meaningful title
        if (titleCell && titleCell.length > 5 &&
            !titleCell.toLowerCase().includes('bil.') &&
            !titleCell.toLowerCase().includes('no.') &&
            !titleCell.match(/^\d+$/)) {
          scrapedAnswers.push({
            id: crypto.randomUUID(),
            questionNumber: questionNumber || undefined,
            title: titleCell,
            questionerName: questionerCell || undefined,
            dateAsked: dateCell || undefined,
            status: statusCell || 'Pending',
            fullTextUrl,
          });
        }
      }
    });

    // Also try to find answers in div/list structures (alternative layouts)
    $('.question-item, .jawapan-item, .soalan-item, [class*="question"], [class*="jawapan"], [class*="soalan"]').each((index, element) => {
      const $item = $(element);
      const title = $item.find('.title, h3, h4, .tajuk, .soalan').first().text().trim() ||
                    $item.find('a').first().text().trim();
      const questionNumber = $item.find('.question-number, .no-soalan').first().text().trim();
      const questioner = $item.find('.questioner, .penyoal, .nama').first().text().trim();
      const date = $item.find('.date, .tarikh, .masa').first().text().trim();
      const status = $item.find('.status, .keadaan').first().text().trim();
      const link = $item.find('a[href*=".pdf"], a[href*="jawapan"]').first();
      const fullTextUrl = link.length ?
        (link.attr('href')?.startsWith('http') ?
          link.attr('href') :
          `${baseUrl}/${link.attr('href')?.replace(/^\//, '')}`)
        : undefined;

      if (title && title.length > 5) {
        // Check if this answer is already added (avoid duplicates)
        const exists = scrapedAnswers.some(a => a.title === title);
        if (!exists) {
          scrapedAnswers.push({
            id: crypto.randomUUID(),
            questionNumber: questionNumber || undefined,
            title,
            questionerName: questioner || undefined,
            dateAsked: date || undefined,
            status: status || 'Pending',
            fullTextUrl,
          });
        }
      }
    });

    // Filter out header rows and empty entries
    const filteredAnswers = scrapedAnswers.filter(answer =>
      answer.title &&
      answer.title.length > 5 &&
      !answer.title.toLowerCase().includes('tajuk') &&
      !answer.title.toLowerCase().includes('title') &&
      !answer.title.toLowerCase().includes('soalan') &&
      !answer.title.toLowerCase().match(/^bil\.?\s*$/i) &&
      !answer.title.toLowerCase().match(/^no\.?\s*$/i)
    );

    console.log(`[Parliamentary Answers Scraper] Successfully scraped ${filteredAnswers.length} oral answers`);

    // Convert to AnswerWithPdf format using helper function
    const answersWithPdfStatus = filteredAnswers.map(answer => scrapedAnswerToAnswerWithPdf(answer, sourceUrl));

    return {
      answers: answersWithPdfStatus,
      scrapedAt: new Date().toISOString(),
      sourceUrl,
    };

  } catch (error: any) {
    console.error('[Parliamentary Answers Scraper] Error scraping answers:', error.message);

    // Return error response
    return {
      answers: [],
      scrapedAt: new Date().toISOString(),
      sourceUrl,
      error: `Failed to scrape parliamentary oral answers: ${error.message}`,
    };
  }
}

/**
 * Scrape parliamentary answers and save new ones to the database
 */
export async function scrapeAndSaveAnswers(): Promise<{ saved: number; updated: number; errors: number }> {
  const result = await scrapeParliamentaryAnswers();
  const stats = { saved: 0, updated: 0, errors: 0 };

  if (result.error || result.answers.length === 0) {
    return stats;
  }

  const db = getDb();
  if (!db) {
    console.log('[Parliamentary Answers] Database not available for saving');
    return stats;
  }

  for (const answer of result.answers) {
    try {
      // Check if answer already exists by title and question number
      const existing = await db.select()
        .from(parliamentaryOralAnswers)
        .where(eq(parliamentaryOralAnswers.title, answer.title))
        .limit(1);

      if (existing.length > 0) {
        // Update existing answer
        await db.update(parliamentaryOralAnswers)
          .set({
            status: answer.status,
            fullTextUrl: answer.fullTextUrl,
            questionerName: answer.questionerName,
            answererName: answer.answererName,
            answererMinistry: answer.answererMinistry,
            dateAsked: answer.dateAsked,
            updatedAt: new Date(),
          })
          .where(eq(parliamentaryOralAnswers.id, existing[0].id));
        stats.updated++;
      } else {
        // Insert new answer
        await db.insert(parliamentaryOralAnswers).values({
          questionNumber: answer.questionNumber,
          title: answer.title,
          questionerName: answer.questionerName,
          questionerMpId: answer.questionerMpId,
          answererName: answer.answererName,
          answererMinistry: answer.answererMinistry,
          dateAsked: answer.dateAsked,
          status: answer.status,
          questionText: answer.questionText,
          answerText: answer.answerText,
          fullTextUrl: answer.fullTextUrl,
          sourceUrl: result.sourceUrl,
        });
        stats.saved++;
      }
    } catch (error) {
      console.error(`[Parliamentary Answers] Error saving answer "${answer.title}":`, error);
      stats.errors++;
    }
  }

  console.log(`[Parliamentary Answers] Saved: ${stats.saved}, Updated: ${stats.updated}, Errors: ${stats.errors}`);
  return stats;
}

/**
 * Download and parse a PDF for a parliamentary oral answer
 */
export async function downloadAndParseAnswerPdf(answerId: string, pdfUrl: string): Promise<{
  success: boolean;
  parsed?: any;
  error?: string;
}> {
  const db = getDb();
  if (!db) {
    return { success: false, error: 'Database not available' };
  }

  try {
    console.log(`[Parliamentary Answers PDF Analysis] Downloading and analyzing PDF for answer ${answerId}`);
    console.log(`[Parliamentary Answers PDF Analysis] URL: ${pdfUrl}`);

    // Download the PDF
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
    console.log(`[Parliamentary Answers PDF Analysis] Downloaded ${pdfBuffer.length} bytes`);

    // Get all MPs for parsing
    const allMps = await db.select().from(mps);
    const parser = new ParliamentaryAnswersPdfParser(allMps);

    // Parse the PDF
    const parsed = await parser.parsePdf(pdfBuffer, pdfUrl.split('/').pop());

    // Update the answer with parsed data
    const updateData: any = {};

    if (parsed.questionNumber) updateData.questionNumber = parsed.questionNumber;
    if (parsed.questionText) updateData.questionText = parsed.questionText;
    if (parsed.answerText) updateData.answerText = parsed.answerText;
    if (parsed.questionerName) updateData.questionerName = parsed.questionerName;
    if (parsed.questionerConstituency) {
      // Store constituency in the questioner name field for now
      updateData.questionerName = `${parsed.questionerName || ''} [${parsed.questionerConstituency}]`.trim();
    }
    if (parsed.questionerMpId) updateData.questionerMpId = parsed.questionerMpId;
    if (parsed.answererName) updateData.answererName = parsed.answererName;
    if (parsed.answererMinistry) updateData.answererMinistry = parsed.answererMinistry;
    if (parsed.dateAsked) updateData.dateAsked = parsed.dateAsked;

    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date();
      await db.update(parliamentaryOralAnswers)
        .set(updateData)
        .where(eq(parliamentaryOralAnswers.id, answerId));
    }

    // Save the PDF file
    const md5Hash = crypto.createHash('md5').update(pdfBuffer).digest('hex');
    const originalFilename = pdfUrl.split('/').pop() || `answer-${answerId}.pdf`;

    await db.insert(parliamentaryAnswerPdfFiles).values({
      answerId,
      originalFilename,
      fileSizeBytes: pdfBuffer.length,
      contentType: 'application/pdf',
      pdfData: pdfBuffer,
      md5Hash,
      downloadedFromUrl: pdfUrl,
    });

    console.log(`[Parliamentary Answers PDF Analysis] ✅ Successfully parsed and saved PDF`);

    return { success: true, parsed };
  } catch (error: any) {
    console.error(`[Parliamentary Answers PDF Analysis] ❌ Error:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Batch process all answers with PDF URLs to download and analyze them
 */
export async function batchProcessAnswerPdfs(): Promise<{
  total: number;
  processed: number;
  failed: number;
  skipped: number;
}> {
  const db = getDb();
  if (!db) {
    console.log('[Parliamentary Answers PDF Batch] Database not available');
    return { total: 0, processed: 0, failed: 0, skipped: 0 };
  }

  try {
    console.log('[Parliamentary Answers PDF Batch] Starting batch PDF processing...');

    // Get all answers with PDF URLs but no PDF data
    const answers = await db.select().from(parliamentaryOralAnswers);

    const answersWithPdfs = answers.filter(a => a.fullTextUrl && a.fullTextUrl.includes('.pdf'));

    console.log(`[Parliamentary Answers PDF Batch] Found ${answersWithPdfs.length} answers with PDF URLs`);

    const stats = {
      total: answersWithPdfs.length,
      processed: 0,
      failed: 0,
      skipped: 0,
    };

    for (const answer of answersWithPdfs) {
      if (!answer.fullTextUrl) continue;

      // Check if PDF already downloaded
      const existingPdf = await db.select({ id: parliamentaryAnswerPdfFiles.id })
        .from(parliamentaryAnswerPdfFiles)
        .where(eq(parliamentaryAnswerPdfFiles.answerId, answer.id))
        .limit(1);

      if (existingPdf.length > 0) {
        console.log(`[Parliamentary Answers PDF Batch] Skipping ${answer.id} - PDF already exists`);
        stats.skipped++;
        continue;
      }

      // Download and parse
      const result = await downloadAndParseAnswerPdf(answer.id, answer.fullTextUrl);

      if (result.success) {
        stats.processed++;
      } else {
        stats.failed++;
      }

      // Add a small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('[Parliamentary Answers PDF Batch] Batch processing complete');
    console.log(`  Total: ${stats.total}, Processed: ${stats.processed}, Failed: ${stats.failed}, Skipped: ${stats.skipped}`);

    return stats;
  } catch (error: any) {
    console.error('[Parliamentary Answers PDF Batch] Error:', error.message);
    throw error;
  }
}
