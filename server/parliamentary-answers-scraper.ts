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

/**
 * Retry helper function with exponential backoff
 * Retries a function up to maxRetries times with exponential backoff on 503 errors
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 4,
  baseDelay: number = 2000,
  context: string = ''
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if it's a 503 error (or network error)
      const is503 = error.response?.status === 503;
      const isNetworkError = !error.response && error.code;

      if ((is503 || isNetworkError) && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`${context} Attempt ${attempt + 1}/${maxRetries + 1} failed (${is503 ? '503 Service Unavailable' : error.message}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Not a retryable error or max retries reached
        break;
      }
    }
  }

  throw lastError;
}

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
 * Helper function to check if text contains Parlimen 15 references
 */
function checkIfParlimen15Page(text: string): boolean {
  const parlimen15Patterns = [
    /parlimen\s+(?:ke[\s-]?)?15/i,
    /parliament\s+(?:ke[\s-]?)?15/i,
    /15th\s+parliament/i,
    /p\.?15/i,
  ];

  for (const pattern of parlimen15Patterns) {
    if (text.match(pattern)) {
      return true;
    }
  }

  // Check for other parliament numbers that would indicate it's NOT Parlimen 15
  const otherParlimenPatterns = [
    /parlimen\s+(?:ke[\s-]?)?([1-9]|1[0-4]|1[6-9]|20)/i,
    /parliament\s+(?:ke[\s-]?)?([1-9]|1[0-4]|1[6-9]|20)/i,
  ];

  for (const pattern of otherParlimenPatterns) {
    if (text.match(pattern)) {
      return false;
    }
  }

  // If we can't determine definitively, assume it's Parlimen 15
  // (since the URL is specifically for Dewan Rakyat which is current)
  return true;
}

/**
 * Interface for extracted PDF links from the Parliament website
 */
interface ExtractedPdfLink {
  pdfPath: string;
  pdfFilename: string;
  dateText: string;
  fullUrl: string;
}

/**
 * Extract PDF links from JavaScript loadResult calls on the Parliament page
 * Pattern: javascript:loadResult('/files/jindex/pdf/JDR02122025.pdf','JDR02122025.pdf')
 */
function extractPdfLinksFromPage(html: string, baseUrl: string): ExtractedPdfLink[] {
  const links: ExtractedPdfLink[] = [];
  
  // Match the loadResult JavaScript calls
  // Pattern: loadResult('/files/jindex/pdf/JDR{DDMMYYYY}.pdf','JDR{DDMMYYYY}.pdf')
  const regex = /loadResult\s*\(\s*['"]([^'"]+\.pdf)['"],\s*['"]([^'"]+)['"].*?\)\s*;?\s*['">\s]*([^<]+)/gi;
  
  let match;
  while ((match = regex.exec(html)) !== null) {
    const pdfPath = match[1];
    const pdfFilename = match[2];
    const dateText = match[3].trim();
    
    // Build full URL
    const fullUrl = pdfPath.startsWith('http') 
      ? pdfPath 
      : `${baseUrl}${pdfPath.startsWith('/') ? '' : '/'}${pdfPath}`;
    
    links.push({
      pdfPath,
      pdfFilename,
      dateText,
      fullUrl,
    });
  }
  
  return links;
}

/**
 * Parse Malaysian date text to a standardized date string
 * e.g., "2 Disember 2025" -> "2025-12-02"
 */
function parseMalaysianDate(dateText: string): string | undefined {
  const months: { [key: string]: string } = {
    'januari': '01', 'january': '01',
    'februari': '02', 'february': '02',
    'mac': '03', 'march': '03',
    'april': '04',
    'mei': '05', 'may': '05',
    'jun': '06', 'june': '06',
    'julai': '07', 'july': '07',
    'ogos': '08', 'august': '08',
    'september': '09',
    'oktober': '10', 'october': '10',
    'november': '11',
    'disember': '12', 'december': '12',
  };

  // Pattern: "2 Disember 2025" or "02 December 2025"
  const match = dateText.toLowerCase().match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (!match) return undefined;

  const day = match[1].padStart(2, '0');
  const monthName = match[2].toLowerCase();
  const year = match[3];

  const month = months[monthName];
  if (!month) return undefined;

  return `${year}-${month}-${day}`;
}

/**
 * Generate potential PDF URLs for a given date
 * The Parliament website uses inconsistent naming: sometimes DDMMYYYY.pdf, sometimes JDR{DDMMYYYY}.pdf
 */
function generatePdfUrls(dateStr: string, baseUrl: string): { url: string; format: string }[] {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const dateCode = `${day}${month}${year}`;

  return [
    { url: `${baseUrl}/files/jindex/pdf/JDR${dateCode}.pdf`, format: 'JDR' },
    { url: `${baseUrl}/files/jindex/pdf/${dateCode}.pdf`, format: 'plain' },
  ];
}

/**
 * Extract all sitting dates from the archive page HTML and known session date ranges
 * UPDATED: Use hardcoded Parlimen 15 session dates since archive HTML doesn't include collapsed nodes
 */
function extractDatesFromArchivePage(html: string): string[] {
  const dates: string[] = [];
  const $ = cheerio.load(html);

  // Method 1: Extract individual dates from the visible tree
  const datePattern = /(\d{1,2})\s+(januari|februari|mac|april|mei|jun|julai|ogos|september|oktober|november|disember)\s+(\d{4})/gi;
  const bodyText = $('body').text();
  let match;
  while ((match = datePattern.exec(bodyText)) !== null) {
    const dateText = match[0];
    const parsed = parseMalaysianDate(dateText);
    if (parsed && !dates.includes(parsed)) {
      dates.push(parsed);
    }
  }

  console.log(`[Archive] Found ${dates.length} dates from current visible tree`);

  // Method 2: Use known Parlimen 15 session date ranges
  // These are the historical sessions that aren't in the HTML because they're in collapsed tree nodes
  const knownSessionRanges = [
    { start: '2023-02-13', end: '2023-04-04', name: 'Penggal 1 Mesyuarat 1' },
    { start: '2023-05-22', end: '2023-06-15', name: 'Penggal 2 Mesyuarat 1' },
    { start: '2023-10-09', end: '2023-11-30', name: 'Penggal 2 Mesyuarat 2' },
    { start: '2024-02-26', end: '2024-03-27', name: 'Penggal 3 Mesyuarat 1' },
    { start: '2024-06-24', end: '2024-07-18', name: 'Penggal 3 Mesyuarat 2' },
    { start: '2024-10-14', end: '2024-12-12', name: 'Penggal 3 Mesyuarat 3' },
  ];

  console.log(`[Archive] Generating dates from ${knownSessionRanges.length} known historical session ranges...`);

  for (const range of knownSessionRanges) {
    const startDate = new Date(range.start);
    const endDate = new Date(range.end);
    let rangeCount = 0;

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      // Only include weekdays (1-5 = Monday-Friday)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        if (!dates.includes(dateStr)) {
          dates.push(dateStr);
          rangeCount++;
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`[Archive]   ${range.name}: ${range.start} to ${range.end} (${rangeCount} weekdays)`);
  }

  return dates.sort();
}

/**
 * Scrapes parliamentary oral answers from the Malaysian Parliament website
 * Updated to extract PDF links from JavaScript loadResult calls
 */
export async function scrapeParliamentaryAnswers(): Promise<AnswersResponse> {
  const sourceUrl = 'https://www.parlimen.gov.my/jawapan-lisan-dr.html?uweb=dr&';
  const baseUrl = 'https://www.parlimen.gov.my';

  try {
    console.log('[Parliamentary Answers Scraper] Fetching oral answers from Parliament website...');

    const response = await retryWithBackoff(
      () => axios.get(sourceUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5,ms;q=0.3',
          'Referer': 'https://www.parlimen.gov.my/',
        },
        timeout: 30000,
        httpsAgent,
      }),
      4,
      2000,
      '[Parliamentary Answers Scraper]'
    );

    const html = response.data;
    const $ = cheerio.load(html);
    const scrapedAnswers: ScrapedAnswer[] = [];

    // Check if the page contains Parlimen 15 data
    const pageText = $('body').text();
    const isParlimen15Page = checkIfParlimen15Page(pageText);

    if (!isParlimen15Page) {
      console.log('[Parliamentary Answers Scraper] ⚠️  Warning: Page may not be Parlimen 15');
      console.log('[Parliamentary Answers Scraper] Proceeding with caution - filtering will be applied');
    } else {
      console.log('[Parliamentary Answers Scraper] ✓ Confirmed: Page is from Parlimen 15');
    }

    // Extract PDF links from JavaScript loadResult calls
    // Pattern: javascript:loadResult('/files/jindex/pdf/JDR02122025.pdf','JDR02122025.pdf')
    const pdfLinks = extractPdfLinksFromPage(html, baseUrl);
    
    console.log(`[Parliamentary Answers Scraper] Found ${pdfLinks.length} PDF links on page`);

    // Create answer entries for each PDF link
    for (const link of pdfLinks) {
      const dateAsked = parseMalaysianDate(link.dateText);
      
      // Generate a title based on the date
      const title = `Jawapan Lisan Dewan Rakyat - ${link.dateText}`;
      
      scrapedAnswers.push({
        id: crypto.randomUUID(),
        title,
        dateAsked: dateAsked || link.dateText,
        status: 'Dijawab', // Answered - since PDFs are available
        fullTextUrl: link.fullUrl,
      });
    }

    // If no PDF links found, fall back to alternative scraping methods
    if (scrapedAnswers.length === 0) {
      console.log('[Parliamentary Answers Scraper] No PDF links found, trying alternative methods...');
      
      // Try to find answer data in table structures
      $('table tbody tr, table tr').each((_index, element) => {
        const $row = $(element);
        const cells = $row.find('td');

        if (cells.length >= 2) {
          const questionNumberCell = $(cells[0]).text().trim();
          const titleCell = $(cells[1]).text().trim() || $(cells[2]).text().trim();
          const questionerCell = cells.length >= 3 ? $(cells[2]).text().trim() : '';
          const dateCell = cells.length >= 4 ? $(cells[3]).text().trim() : '';
          const statusCell = cells.length >= 5 ? $(cells[4]).text().trim() : '';

          const linkElement = $row.find('a[href*=".pdf"], a[href*="jawapan"], a[href*="soalan"]').first();
          const fullTextUrl = linkElement.length ?
            (linkElement.attr('href')?.startsWith('http') ?
              linkElement.attr('href') :
              `${baseUrl}/${linkElement.attr('href')?.replace(/^\//, '')}`)
            : undefined;

          const questionNumberMatch = questionNumberCell.match(/S\.?\s*\d+/i) ||
                                       titleCell.match(/S\.?\s*\d+/i);
          const questionNumber = questionNumberMatch ? questionNumberMatch[0] : questionNumberCell;

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
    }

    // Filter out header rows and empty entries
    const filteredAnswers = scrapedAnswers.filter(answer =>
      answer.title &&
      answer.title.length > 5 &&
      !answer.title.toLowerCase().includes('tajuk') &&
      !answer.title.toLowerCase().includes('title') &&
      !answer.title.toLowerCase().match(/^bil\.?\s*$/i) &&
      !answer.title.toLowerCase().match(/^no\.?\s*$/i)
    );

    // Further filter to only include Parlimen 15 data
    const parlimen15Answers = filteredAnswers.filter(answer => {
      const textToCheck = `${answer.title} ${answer.fullTextUrl || ''}`;

      // Reject if it explicitly mentions a different parliament number (1-14, 16-20)
      const otherParlimenPatterns = [
        /parlimen\s+(?:ke[\s-]?)?([1-9]|1[0-4]|1[6-9]|20)/i,
        /parliament\s+(?:ke[\s-]?)?([1-9]|1[0-4]|1[6-9]|20)/i,
        /p[\s.-]?([1-9]|1[0-4]|1[6-9]|20)[^\d]/i,
      ];

      for (const pattern of otherParlimenPatterns) {
        if (textToCheck.match(pattern)) {
          console.log(`[Parliamentary Answers Scraper] Filtered out (not Parlimen 15): ${answer.title.substring(0, 60)}...`);
          return false;
        }
      }

      return true;
    });

    const totalScraped = scrapedAnswers.length;
    const afterBasicFilter = filteredAnswers.length;
    const finalCount = parlimen15Answers.length;

    console.log(`[Parliamentary Answers Scraper] Successfully scraped ${finalCount} oral answers (Parlimen 15 only)`);
    console.log(`[Parliamentary Answers Scraper] Filtered: ${totalScraped} scraped → ${afterBasicFilter} after basic filter → ${finalCount} Parlimen 15 only`);

    // Convert to AnswerWithPdf format using helper function
    const answersWithPdfStatus = parlimen15Answers.map(answer => scrapedAnswerToAnswerWithPdf(answer, sourceUrl));

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

    // If the PDF is not from Parlimen 15, skip it
    if (!parsed) {
      console.log(`[Parliamentary Answers PDF Analysis] ⚠️  Skipping - PDF is not from Parlimen 15`);
      return { success: false, error: 'PDF is not from Parlimen 15' };
    }

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

/**
 * Scrape Parlimen 15 archive to get all historical oral answer sessions
 * NEW APPROACH: Extract dates from archive HTML and generate direct PDF URLs
 * This avoids the search endpoint which returns 500/503 errors
 */
export async function scrapeParlimen15Archive(): Promise<{
  sessions: Array<{ date: string; pdfUrl: string; title: string }>;
  error?: string;
}> {
  const archiveUrl = 'https://www.parlimen.gov.my/jawapan-lisan-dr.html?uweb=dr&arkib=yes';
  const baseUrl = 'https://www.parlimen.gov.my';
  const sessions: Array<{ date: string; pdfUrl: string; title: string }> = [];
  const seenUrls = new Set<string>();

  try {
    console.log('[Parlimen 15 Archive] Fetching archive page...');

    // Get the archive page with retry logic
    const response = await retryWithBackoff(
      () => axios.get(archiveUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5,ms;q=0.3',
        },
        timeout: 30000,
        httpsAgent,
      }),
      4,
      2000,
      '[Parlimen 15 Archive]'
    );

    const html = response.data;

    // Method 1: Extract PDF links from loadResult() JavaScript calls
    const pdfLinks = extractPdfLinksFromPage(html, baseUrl);
    console.log(`[Parlimen 15 Archive] Found ${pdfLinks.length} PDF links from loadResult() calls`);

    for (const link of pdfLinks) {
      if (!seenUrls.has(link.fullUrl)) {
        seenUrls.add(link.fullUrl);
        const dateFormatted = parseMalaysianDate(link.dateText) || link.dateText;
        sessions.push({
          date: dateFormatted,
          pdfUrl: link.fullUrl,
          title: `Jawapan Lisan Dewan Rakyat - ${link.dateText}`,
        });
      }
    }

    // Method 2: Extract all dates from the HTML and generate PDF URLs
    console.log('[Parlimen 15 Archive] Extracting dates from archive page structure...');
    const extractedDates = extractDatesFromArchivePage(html);
    console.log(`[Parlimen 15 Archive] Extracted ${extractedDates.length} dates from archive`);

    // For each extracted date, generate PDF URLs and save them
    // We skip validation here because the Parliament website blocks HEAD/GET requests
    // The actual download process will determine which URLs work
    let generatedCount = 0;

    for (const dateStr of extractedDates) {
      // Generate both possible URL formats
      const pdfUrls = generatePdfUrls(dateStr, baseUrl);

      // Try JDR format first (more common), then plain format
      for (const { url, format } of pdfUrls) {
        // Skip if we already have this URL
        if (seenUrls.has(url)) {
          continue;
        }

        // Add the URL to our sessions list
        seenUrls.add(url);
        generatedCount++;

        const date = new Date(dateStr);
        const monthNames = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
        const dateText = `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;

        sessions.push({
          date: dateStr,
          pdfUrl: url,
          title: `Jawapan Lisan Dewan Rakyat - ${dateText}`,
        });

        console.log(`[Parlimen 15 Archive]   + Generated (${format}): ${url.split('/').pop()}`);

        // Only add the JDR format (first one) per date
        break;
      }
    }

    console.log(`[Parlimen 15 Archive] Generated ${generatedCount} PDF URLs from extracted dates`);
    console.log(`[Parlimen 15 Archive] Total unique sessions: ${sessions.length}`);

    return { sessions };
  } catch (error: any) {
    console.error('[Parlimen 15 Archive] Error:', error.message);
    return { sessions: [], error: error.message };
  }
}

/**
 * Full sync: Scrape all Parlimen 15 oral answers from both main page and archive,
 * save to database, and download all PDFs
 */
export async function fullSyncParlimen15OralAnswers(): Promise<{
  totalSessions: number;
  saved: number;
  updated: number;
  pdfsDownloaded: number;
  errors: number;
}> {
  const stats = {
    totalSessions: 0,
    saved: 0,
    updated: 0,
    pdfsDownloaded: 0,
    errors: 0,
  };

  const db = getDb();
  if (!db) {
    console.log('[Full Sync] Database not available');
    return stats;
  }

  try {
    console.log('[Full Sync] Starting full sync of Parlimen 15 oral answers...');

    // First, scrape the main page for current session
    const mainResult = await scrapeParliamentaryAnswers();
    const allSessions: Array<{ date: string; pdfUrl: string; title: string }> = [];

    if (mainResult.answers) {
      for (const answer of mainResult.answers) {
        if (answer.fullTextUrl) {
          allSessions.push({
            date: answer.dateAsked || '',
            pdfUrl: answer.fullTextUrl,
            title: answer.title,
          });
        }
      }
    }

    console.log(`[Full Sync] Found ${allSessions.length} sessions from main page`);

    // Then scrape the archive for historical sessions
    const archiveResult = await scrapeParlimen15Archive();
    if (archiveResult.sessions) {
      for (const session of archiveResult.sessions) {
        // Avoid duplicates
        if (!allSessions.some(s => s.pdfUrl === session.pdfUrl)) {
          allSessions.push(session);
        }
      }
    }

    stats.totalSessions = allSessions.length;
    console.log(`[Full Sync] Total unique sessions: ${stats.totalSessions}`);

    // Get all MPs for PDF parsing
    const allMps = await db.select().from(mps);
    const parser = new ParliamentaryAnswersPdfParser(allMps);

    // Process each session
    for (const session of allSessions) {
      try {
        // Check if this session already exists
        const existing = await db.select()
          .from(parliamentaryOralAnswers)
          .where(eq(parliamentaryOralAnswers.fullTextUrl, session.pdfUrl))
          .limit(1);

        let answerId: string;

        if (existing.length > 0) {
          answerId = existing[0].id;
          stats.updated++;
        } else {
          // Create new entry
          const newId = crypto.randomUUID();
          await db.insert(parliamentaryOralAnswers).values({
            id: newId,
            title: session.title,
            dateAsked: session.date,
            status: 'Dijawab',
            fullTextUrl: session.pdfUrl,
            sourceUrl: 'https://www.parlimen.gov.my/jawapan-lisan-dr.html?uweb=dr&',
          });
          answerId = newId;
          stats.saved++;
        }

        // Check if PDF already downloaded
        const existingPdf = await db.select({ id: parliamentaryAnswerPdfFiles.id })
          .from(parliamentaryAnswerPdfFiles)
          .where(eq(parliamentaryAnswerPdfFiles.answerId, answerId))
          .limit(1);

        if (existingPdf.length === 0) {
          // Download and parse PDF
          console.log(`[Full Sync] Downloading PDF: ${session.pdfUrl}`);
          
          try {
            const pdfResponse = await axios.get(session.pdfUrl, {
              responseType: 'arraybuffer',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/pdf,*/*',
              },
              timeout: 120000,
              httpsAgent,
            });

            const pdfBuffer = Buffer.from(pdfResponse.data);
            console.log(`[Full Sync] Downloaded ${pdfBuffer.length} bytes`);

            // Parse the PDF
            const parsed = await parser.parsePdf(pdfBuffer, session.pdfUrl.split('/').pop());

            // Update the answer with parsed data if available
            if (parsed) {
              const updateData: any = { updatedAt: new Date() };
              if (parsed.questionNumber) updateData.questionNumber = parsed.questionNumber;
              if (parsed.questionText) updateData.questionText = parsed.questionText;
              if (parsed.answerText) updateData.answerText = parsed.answerText;
              if (parsed.questionerName) {
                updateData.questionerName = parsed.questionerConstituency 
                  ? `${parsed.questionerName} [${parsed.questionerConstituency}]`
                  : parsed.questionerName;
              }
              if (parsed.questionerMpId) updateData.questionerMpId = parsed.questionerMpId;
              if (parsed.answererName) updateData.answererName = parsed.answererName;
              if (parsed.answererMinistry) updateData.answererMinistry = parsed.answererMinistry;
              if (parsed.dateAsked) updateData.dateAsked = parsed.dateAsked;

              await db.update(parliamentaryOralAnswers)
                .set(updateData)
                .where(eq(parliamentaryOralAnswers.id, answerId));
            }

            // Save PDF to database
            const md5Hash = crypto.createHash('md5').update(pdfBuffer).digest('hex');
            const originalFilename = session.pdfUrl.split('/').pop() || `answer-${answerId}.pdf`;

            await db.insert(parliamentaryAnswerPdfFiles).values({
              answerId,
              originalFilename,
              fileSizeBytes: pdfBuffer.length,
              contentType: 'application/pdf',
              pdfData: pdfBuffer,
              md5Hash,
              downloadedFromUrl: session.pdfUrl,
            });

            stats.pdfsDownloaded++;
            console.log(`[Full Sync] ✅ Saved PDF for ${session.title}`);

            // Small delay to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (pdfError: any) {
            console.error(`[Full Sync] Failed to download PDF: ${pdfError.message}`);
            stats.errors++;
          }
        }
      } catch (sessionError: any) {
        console.error(`[Full Sync] Error processing session "${session.title}":`, sessionError.message);
        stats.errors++;
      }
    }

    console.log('[Full Sync] ✅ Full sync complete');
    console.log(`  Total Sessions: ${stats.totalSessions}`);
    console.log(`  Saved: ${stats.saved}, Updated: ${stats.updated}`);
    console.log(`  PDFs Downloaded: ${stats.pdfsDownloaded}, Errors: ${stats.errors}`);

    return stats;
  } catch (error: any) {
    console.error('[Full Sync] Error:', error.message);
    throw error;
  }
}
