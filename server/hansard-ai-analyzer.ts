/**
 * Copyright by Calmic Sdn Bhd
 * Background job for AI analysis of Hansard records
 */

import { storage } from "./storage";
import { analyzeHansardTranscript, generateHansardSummary, isAIConfigured } from "./ai-service";
import { jobTracker } from "./job-tracker";

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

  // Get all Hansard records
  const allRecords = await storage.getAllHansardRecords();

  // Filter records that need analysis
  const recordsToAnalyze = forceReanalyze
    ? allRecords
    : allRecords.filter(r => !r.summary || r.summary.startsWith("Parliamentary session"));

  const recordsToProcess = limit > 0 ? recordsToAnalyze.slice(0, limit) : recordsToAnalyze;

  currentJob = {
    total: recordsToProcess.length,
    processed: 0,
    successful: 0,
    failed: 0,
    status: "running",
    startedAt: new Date(),
    errors: [],
  };

  console.log(`[AI Analysis] Starting bulk analysis of ${recordsToProcess.length} Hansard records`);

  for (const record of recordsToProcess) {
    if (cancelRequested) {
      currentJob.status = "cancelled";
      console.log("[AI Analysis] Job cancelled by user");
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

    // Rate limiting delay
    if (delayMs > 0 && currentJob.processed < recordsToProcess.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  if (currentJob.status === "running") {
    currentJob.status = "completed";
  }
  currentJob.completedAt = new Date();
  currentJob.currentSession = undefined;

  console.log(`[AI Analysis] Completed. Processed: ${currentJob.processed}, Success: ${currentJob.successful}, Failed: ${currentJob.failed}`);

  return currentJob;
}
