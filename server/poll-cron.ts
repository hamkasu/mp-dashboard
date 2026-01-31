/**
 * Weekly Poll Generation Cron Job
 * Copyright by Calmic Sdn Bhd
 *
 * Generates weekly polls using AI and manages poll lifecycle
 */

import cron from 'node-cron';
import { storage } from './storage';

let pollGenerationCron: ReturnType<typeof cron.schedule> | null = null;
let pollStatusCron: ReturnType<typeof cron.schedule> | null = null;

/**
 * Run weekly poll generation using the PollGeneratorAgent
 */
export async function runWeeklyPollGeneration(): Promise<{
  success: boolean;
  pollsCreated: number;
  error?: string;
}> {
  console.log('\n🗳️  [Poll Cron] Starting weekly poll generation...');

  try {
    const { AgentService } = await import('./services/agentService');

    const result = await AgentService.runAgent('poll-generator' as any, {
      triggeredBy: 'scheduled',
      parameters: {
        numberOfPolls: 1,
        forceRegenerate: false,
      },
    });

    if (result.success) {
      console.log(`✅ [Poll Cron] Weekly poll generation completed. Polls created: ${result.data?.pollsCreated || 0}`);
      return {
        success: true,
        pollsCreated: result.data?.pollsCreated || 0,
      };
    } else {
      console.error(`❌ [Poll Cron] Poll generation failed: ${result.summary}`);
      return {
        success: false,
        pollsCreated: 0,
        error: result.summary,
      };
    }
  } catch (error: any) {
    console.error('❌ [Poll Cron] Error during poll generation:', error.message);
    return {
      success: false,
      pollsCreated: 0,
      error: error.message,
    };
  }
}

/**
 * Run poll status management (close expired, activate scheduled)
 */
export async function runPollStatusManagement(): Promise<{
  closed: number;
  activated: number;
}> {
  console.log('🔄 [Poll Cron] Running poll status management...');

  try {
    const closed = await storage.closeExpiredPolls();
    const activated = await storage.activateScheduledPolls();

    if (closed > 0 || activated > 0) {
      console.log(`✅ [Poll Cron] Status update: ${closed} closed, ${activated} activated`);
    }

    return { closed, activated };
  } catch (error: any) {
    console.error('❌ [Poll Cron] Error during status management:', error.message);
    return { closed: 0, activated: 0 };
  }
}

/**
 * Start the weekly poll generation cron job
 * Runs every Monday at 9:00 AM Malaysia time
 */
export function startPollGenerationCron(): void {
  if (pollGenerationCron) {
    console.log('⚠️  [Poll Cron] Generation cron already running');
    return;
  }

  // Cron expression: "0 9 * * 1" = At 9:00 AM every Monday
  pollGenerationCron = cron.schedule(
    '0 9 * * 1',
    async () => {
      console.log('\n⏰ [Poll Cron] Weekly poll generation triggered');
      await runWeeklyPollGeneration();
    },
    {
      timezone: 'Asia/Kuala_Lumpur',
    }
  );

  console.log('✅ [Poll Cron] Weekly poll generation scheduled for Monday 9:00 AM (Asia/Kuala_Lumpur)');
}

/**
 * Start the poll status management cron job
 * Runs every hour to close expired polls and activate scheduled ones
 */
export function startPollStatusCron(): void {
  if (pollStatusCron) {
    console.log('⚠️  [Poll Cron] Status cron already running');
    return;
  }

  // Cron expression: "0 * * * *" = Every hour at minute 0
  pollStatusCron = cron.schedule(
    '0 * * * *',
    async () => {
      await runPollStatusManagement();
    },
    {
      timezone: 'Asia/Kuala_Lumpur',
    }
  );

  console.log('✅ [Poll Cron] Hourly poll status management scheduled');
}

/**
 * Stop poll cron jobs
 */
export function stopPollCrons(): void {
  if (pollGenerationCron) {
    pollGenerationCron.stop();
    pollGenerationCron = null;
    console.log('🛑 [Poll Cron] Generation cron stopped');
  }

  if (pollStatusCron) {
    pollStatusCron.stop();
    pollStatusCron = null;
    console.log('🛑 [Poll Cron] Status cron stopped');
  }
}

/**
 * Initialize all poll-related cron jobs
 */
export function initializePollCrons(): void {
  startPollGenerationCron();
  startPollStatusCron();
}
