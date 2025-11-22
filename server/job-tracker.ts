/**
 * Copyright by Calmic Sdn Bhd
 */

import { randomUUID } from 'crypto';

export interface JobProgress {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  progress: {
    current: number;
    total: number;
    message: string;
  };
  result?: {
    successCount: number;
    errorCount: number;
    skippedCount: number;
  };
  error?: string;
}

class JobTracker {
  private jobs: Map<string, JobProgress> = new Map();
  private maxJobHistory = 50; // Keep last 50 jobs

  createJob(total: number, message: string): string {
    const jobId = randomUUID();
    
    const job: JobProgress = {
      jobId,
      status: 'pending',
      startedAt: new Date(),
      progress: {
        current: 0,
        total,
        message
      }
    };
    
    this.jobs.set(jobId, job);
    this.cleanupOldJobs();
    
    return jobId;
  }

  startJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'running';
    }
  }

  updateProgress(jobId: string, current: number, message: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress.current = current;
      job.progress.message = message;
    }
  }

  completeJob(jobId: string, result: JobProgress['result']): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.completedAt = new Date();
      job.result = result;
    }
  }

  failJob(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.error = error;
    }
  }

  getJob(jobId: string): JobProgress | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): JobProgress[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime()
    );
  }

  private cleanupOldJobs(): void {
    const allJobs = this.getAllJobs();
    if (allJobs.length > this.maxJobHistory) {
      const jobsToRemove = allJobs.slice(this.maxJobHistory);
      jobsToRemove.forEach(job => this.jobs.delete(job.jobId));
    }
  }
}

export const jobTracker = new JobTracker();
