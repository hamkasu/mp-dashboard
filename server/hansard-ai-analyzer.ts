/**
 * Copyright by Calmic Sdn Bhd
 * Background job for AI analysis of Hansard records
 * Memory-optimized: Processes records in batches to prevent OOM crashes
 */

import { storage } from "./storage";
import { analyzeHansardTranscript, generateHansardSummary, isAIConfigured } from "./ai-service";
import { jobTracker } from "./job-tracker";
import { forceGC } from "./middleware/memory-monitor";

const BATCH_SIZE = 5; // Process 5 records at a time to limit memory usage

export interface AnalysisJobProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  currentSession?: string;
  status: "running" | "completed" | "failed" | "cancelled";
  startedAt: Date;
  completedAt?: Date;
  errors: string[];
}

let currentJob: AnalysisJobProgress | null = null;
let cancelRequested = false;

export function getAnalysisJobStatus(): AnalysisJobProgress | null {
  return currentJob;
}

export function cancelAnalysisJob(): boolean {
  if (currentJob && currentJob.status === "running") {
    cancelRequested = true;
    return true;
  }
  return false;
}

/**
 * Run bulk AI analysis on all Hansard records that don't have summaries
 * Memory-optimized: Uses pagination to avoid loading all records into memory
 */
export async function runBulkHansardAnalysis(options: {
  forceReanalyze?: boolean;
  limit?: number;
  delayMs?: number;
} = {}): Promise<AnalysisJobProgress> {
  const { forceReanalyze = false, limit = 0, delayMs = 1000 } = options;

  if (!isAIConfigured()) {
    throw new Error("AI service not configured. Set OPENROUTER_API_KEY environment variable.");
  }

  if (currentJob && currentJob.status === "running") {
    throw new Error("Analysis job already running");
  }

  cancelRequested = false;

  // Get count of records that need analysis (without loading full data)
  // We'll fetch records in batches to avoid memory issues
  const allRecordIds = await storage.getHansardRecordIds();
  const totalRecords = limit > 0 ? Math.min(allRecordIds.length, limit) : allRecordIds.length;

  currentJob = {
    total: totalRecords,
    processed: 0,
    successful: 0,
    failed: 0,
    status: "running",
    startedAt: new Date(),
    errors: [],
  };

  console.log(`[AI Analysis] Starting bulk analysis of up to ${totalRecords} Hansard records (batch size: ${BATCH_SIZE})`);

  let offset = 0;
  let processedCount = 0;

  // Process records in batches
  while (processedCount < totalRecords && !cancelRequested) {
    // Fetch one batch at a time
    const batch = await storage.getHansardRecordsBatch(offset, BATCH_SIZE, forceReanalyze);
    
    if (batch.length === 0) {
      console.log(`[AI Analysis] No more records to process`);
      break;
    }

    console.log(`[AI Analysis] Processing batch ${Math.floor(offset / BATCH_SIZE) + 1} (${batch.length} records)`);

    for (const record of batch) {
      if (cancelRequested) {
        currentJob.status = "cancelled";
        console.log("[AI Analysis] Job cancelled by user");
        break;
      }

      if (limit > 0 && processedCount >= limit) {
        break;
      }

      currentJob.currentSession = record.sessionNumber;

      try {
        console.log(`[AI Analysis] Processing ${record.sessionNumber} (${record.sessionDate})`);

        // Get transcript from the record
        const transcript = record.transcript || "";

        if (!transcript || transcript.length < 100) {
          console.log(`[AI Analysis] Skipping ${record.sessionNumber} - no transcript`);
          currentJob.processed++;
          processedCount++;
          continue;
        }

        // Generate analysis
        const result = await analyzeHansardTranscript(
          record.sessionNumber,
          record.sessionDate.toISOString().split("T")[0],
          transcript
        );

        if (result.success && result.analysis) {
          // Update the record with the AI summary
          await storage.updateHansardRecord(record.id, {
            summary: result.analysis.summary,
          });

          console.log(`[AI Analysis] Updated ${record.sessionNumber}: ${result.analysis.summary.substring(0, 100)}...`);
          currentJob.successful++;
        } else {
          console.error(`[AI Analysis] Failed ${record.sessionNumber}: ${result.error}`);
          currentJob.errors.push(`${record.sessionNumber}: ${result.error}`);
          currentJob.failed++;
        }
      } catch (error: any) {
        console.error(`[AI Analysis] Error processing ${record.sessionNumber}:`, error.message);
        currentJob.errors.push(`${record.sessionNumber}: ${error.message}`);
        currentJob.failed++;
      }

      currentJob.processed++;
      processedCount++;

      // Rate limiting delay
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // Force garbage collection after each batch to free memory
    forceGC(false);
    
    offset += BATCH_SIZE;
  }

  if (currentJob.status === "running") {
    currentJob.status = "completed";
  }
  currentJob.completedAt = new Date();
  currentJob.currentSession = undefined;

  // Final cleanup
  forceGC(true);

  console.log(`[AI Analysis] Completed. Processed: ${currentJob.processed}, Success: ${currentJob.successful}, Failed: ${currentJob.failed}`);

  return currentJob;
}
