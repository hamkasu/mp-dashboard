/**
 * Copyright by Calmic Sdn Bhd
 *
 * Script to download PDF files for parliamentary oral answers
 * This script downloads PDFs from the Parliament website and stores them in the database
 */

import { getDb } from '../server/db';
import { parliamentaryOralAnswers, parliamentaryAnswerPdfFiles } from '@shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import https from 'https';
import crypto from 'crypto';

// SECURITY NOTE: The Malaysian Parliament website has SSL certificate validation issues
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

interface DownloadStats {
  total: number;
  downloaded: number;
  skipped: number;
  failed: number;
  totalBytes: number;
}

/**
 * Download a single PDF and save it to the database
 */
async function downloadPdf(
  answerId: string,
  pdfUrl: string,
  title: string
): Promise<{ success: boolean; bytes?: number; error?: string }> {
  const db = getDb();
  if (!db) {
    return { success: false, error: 'Database not available' };
  }

  try {
    console.log(`  📥 Downloading: ${title}`);
    console.log(`     URL: ${pdfUrl}`);

    const response = await axios.get(pdfUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/pdf,*/*',
      },
      timeout: 120000, // 2 minutes timeout
      httpsAgent,
    });

    const pdfBuffer = Buffer.from(response.data);
    const md5Hash = crypto.createHash('md5').update(pdfBuffer).digest('hex');

    // Extract filename from URL
    const urlPath = new URL(pdfUrl).pathname;
    const originalFilename = urlPath.split('/').pop() || `answer-${answerId}.pdf`;

    // Save to database
    await db.insert(parliamentaryAnswerPdfFiles).values({
      answerId,
      originalFilename,
      fileSizeBytes: pdfBuffer.length,
      contentType: 'application/pdf',
      pdfData: pdfBuffer,
      md5Hash,
      downloadedFromUrl: pdfUrl,
    });

    console.log(`  ✅ Saved: ${originalFilename} (${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
    return { success: true, bytes: pdfBuffer.length };

  } catch (error: any) {
    console.error(`  ❌ Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main function to download all PDFs
 */
async function main() {
  console.log('🚀 Parliamentary PDF Downloader\n');

  const db = getDb();
  if (!db) {
    console.error('❌ Database not available');
    process.exit(1);
  }

  const stats: DownloadStats = {
    total: 0,
    downloaded: 0,
    skipped: 0,
    failed: 0,
    totalBytes: 0,
  };

  try {
    // Get all answers with PDF URLs
    console.log('📊 Fetching parliamentary answers with PDF links...\n');
    const answers = await db.select().from(parliamentaryOralAnswers);

    const answersWithPdfs = answers.filter(a => a.fullTextUrl && a.fullTextUrl.toLowerCase().includes('.pdf'));
    stats.total = answersWithPdfs.length;

    console.log(`Found ${stats.total} answers with PDF URLs\n`);

    if (stats.total === 0) {
      console.log('ℹ️  No PDFs to download');
      return;
    }

    // Process each answer
    for (let i = 0; i < answersWithPdfs.length; i++) {
      const answer = answersWithPdfs[i];
      const progress = `[${i + 1}/${stats.total}]`;

      console.log(`\n${progress} Processing: ${answer.title}`);

      if (!answer.fullTextUrl) {
        console.log(`  ⏭️  Skipped: No PDF URL`);
        stats.skipped++;
        continue;
      }

      // Check if PDF already exists
      const existingPdf = await db
        .select({ id: parliamentaryAnswerPdfFiles.id })
        .from(parliamentaryAnswerPdfFiles)
        .where(eq(parliamentaryAnswerPdfFiles.answerId, answer.id))
        .limit(1);

      if (existingPdf.length > 0) {
        console.log(`  ⏭️  Skipped: PDF already exists in database`);
        stats.skipped++;
        continue;
      }

      // Download the PDF
      const result = await downloadPdf(answer.id, answer.fullTextUrl, answer.title);

      if (result.success && result.bytes) {
        stats.downloaded++;
        stats.totalBytes += result.bytes;
      } else {
        stats.failed++;
      }

      // Add a delay to avoid overwhelming the server
      if (i < answersWithPdfs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Download Summary');
    console.log('='.repeat(60));
    console.log(`Total PDFs found:     ${stats.total}`);
    console.log(`✅ Downloaded:        ${stats.downloaded}`);
    console.log(`⏭️  Skipped:           ${stats.skipped}`);
    console.log(`❌ Failed:            ${stats.failed}`);
    console.log(`📦 Total size:        ${(stats.totalBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log('='.repeat(60));

    if (stats.downloaded > 0) {
      console.log('\n🎉 PDF download complete!');
    }

  } catch (error: any) {
    console.error('\n❌ Error during PDF download:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
