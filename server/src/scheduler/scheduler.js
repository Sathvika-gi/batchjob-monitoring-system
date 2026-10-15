import cron from 'node-cron';
import { Job } from '../models/Job.js';
import { createExecution, simulateExecution } from '../engine/executionEngine.js';
import { generatePredictiveAlert } from '../prediction/predictionService.js';
import { logger } from '../utils/logger.js';

let schedulerTask = null;
let isRunning = false;

/**
 * Check for due jobs and trigger them.
 * Simple: jobs with scheduleType='cron' and nextRunAt <= now.
 */
async function checkAndRunDueJobs() {
  if (isRunning) {
    logger.debug('Scheduler: previous run still in progress, skipping');
    return;
  }
  isRunning = true;
  try {
    const now = new Date();
    const dueJobs = await Job.find({
      isEnabled: true,
      scheduleType: 'cron',
      nextRunAt: { $lte: now },
      status: { $nin: ['running', 'queued'] },
    }).lean();

    for (const job of dueJobs) {
      try {
        logger.info(`Scheduler: triggering job ${job.jobKey}`);
        const execution = await createExecution(job._id, 'scheduled');
        simulateExecution(execution._id).catch(e => logger.error(`Sim error ${job.jobKey}: ${e.message}`));
        // Update nextRunAt (simple: add expected duration + buffer)
        const nextRun = new Date(now.getTime() + 3600 * 1000); // 1 hour ahead by default
        await Job.findByIdAndUpdate(job._id, { nextRunAt: nextRun });
      } catch (e) {
        logger.warn(`Scheduler: failed to trigger ${job.jobKey}: ${e.message}`);
      }
    }

    // Run predictive analysis on enabled jobs
    const allEnabled = await Job.find({ isEnabled: true }).lean();
    for (const job of allEnabled) {
      try { await generatePredictiveAlert(job); } catch (e) {}
    }
  } catch (err) {
    logger.error(`Scheduler error: ${err.message}`);
  } finally {
    isRunning = false;
  }
}

export function startScheduler() {
  if (schedulerTask) {
    logger.warn('Scheduler already running');
    return;
  }
  // Run every minute
  schedulerTask = cron.schedule('* * * * *', checkAndRunDueJobs);
  logger.info('Job scheduler started (runs every minute)');
}

export function stopScheduler() {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    logger.info('Job scheduler stopped');
  }
}
