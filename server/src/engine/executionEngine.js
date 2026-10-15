import { Execution } from '../models/Execution.js';
import { Job } from '../models/Job.js';
import { Alert } from '../models/Alert.js';
import { AuditLog } from '../models/AuditLog.js';
import { Dependency } from '../models/Dependency.js';
import { getDownstreamJobIds } from '../services/dependencyService.js';
import { logger } from '../utils/logger.js';
import { generatePredictiveAlert } from '../prediction/predictionService.js';

const TRANSITION_MAP = {
  queued: ['running', 'cancelled', 'blocked'],
  running: ['success', 'failed', 'timed_out', 'cancelled'],
  success: [],
  failed: [],
  cancelled: [],
  timed_out: [],
  blocked: ['queued', 'cancelled'],
  skipped: [],
};

export function isValidTransition(from, to) {
  return TRANSITION_MAP[from]?.includes(to) ?? false;
}

/**
 * Create a new execution record and update the job state.
 */
export async function createExecution(jobId, triggerType, userId = null, attemptNumber = 1) {
  const job = await Job.findById(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);
  if (!job.isEnabled) throw new Error(`Job ${job.jobKey} is disabled`);

  // Check for already-running execution
  const running = await Execution.findOne({ jobId, status: { $in: ['queued', 'running'] } });
  if (running) throw new Error(`Job ${job.jobKey} is already running or queued`);

  const execution = await Execution.create({
    jobId,
    workflowId: job.workflowId,
    status: 'queued',
    triggerType,
    attemptNumber,
    scheduledAt: new Date(),
    triggeredBy: userId,
  });

  await Job.findByIdAndUpdate(jobId, { status: 'queued' });
  logger.info(`Execution created: ${execution._id} for job ${job.jobKey}`);
  return execution;
}

/**
 * Simulate job execution (safe demo mode - no shell commands).
 * Transitions: queued -> running -> success/failed/timed_out
 */
export async function simulateExecution(executionId) {
  const execution = await Execution.findById(executionId).populate('jobId');
  if (!execution) throw new Error(`Execution ${executionId} not found`);
  const job = execution.jobId;

  // Transition to running
  execution.status = 'running';
  execution.startedAt = new Date();
  await execution.save();
  await Job.findByIdAndUpdate(job._id, { status: 'running' });

  const simConfig = job.simulationConfig || {};
  const successRate = simConfig.successRate ?? 0.85;
  const baseDuration = simConfig.baseDurationMs || job.expectedDurationMs || 300000;
  const variability = simConfig.variabilityFactor ?? 0.2;

  // Simulate duration with variability
  const variance = baseDuration * variability;
  const actualDuration = Math.max(1000, baseDuration + (Math.random() - 0.5) * 2 * variance);
  const willSucceed = Math.random() < successRate;
  const willTimeout = actualDuration > job.timeoutMs;

  // Simulate async execution (minimal delay in demo)
  await new Promise(resolve => setTimeout(resolve, Math.min(actualDuration / 100, 3000)));

  const completedAt = new Date();
  let finalStatus;
  let errorMessage = null;
  const logs = [
    `[${new Date().toISOString()}] Job ${job.jobKey} started`,
    `[${new Date().toISOString()}] Processing initiated (simulated)`,
  ];

  if (willTimeout) {
    finalStatus = 'timed_out';
    errorMessage = `Job exceeded timeout of ${Math.round(job.timeoutMs / 60000)} minutes.`;
    logs.push(`[${new Date().toISOString()}] TIMEOUT: ${errorMessage}`);
  } else if (willSucceed) {
    finalStatus = 'success';
    logs.push(`[${new Date().toISOString()}] Job completed successfully`);
    logs.push(`[${new Date().toISOString()}] Duration: ${Math.round(actualDuration / 1000)}s`);
  } else {
    finalStatus = 'failed';
    const errors = [
      'Connection refused to data source',
      'Data validation failed: unexpected null values in column ORDER_ID',
      'Insufficient disk space for temporary files',
      'Upstream data not available yet',
      'Memory limit exceeded during transformation',
    ];
    errorMessage = errors[Math.floor(Math.random() * errors.length)];
    logs.push(`[${new Date().toISOString()}] ERROR: ${errorMessage}`);
  }

  await Execution.findByIdAndUpdate(executionId, {
    status: finalStatus,
    completedAt,
    durationMs: Math.round(actualDuration),
    errorMessage,
    logs,
  });

  const jobUpdate = {
    status: finalStatus === 'success' ? 'pending' : finalStatus,
    lastRunAt: completedAt,
    lastRunStatus: finalStatus,
    lastDurationMs: Math.round(actualDuration),
  };
  await Job.findByIdAndUpdate(job._id, jobUpdate);

  // Post-execution actions
  if (finalStatus === 'failed' || finalStatus === 'timed_out') {
    await handleExecutionFailure(job, execution, finalStatus, errorMessage);
  } else if (finalStatus === 'success') {
    await triggerDependentJobs(job._id);
    try { await generatePredictiveAlert(job); } catch (e) { logger.warn(`Prediction error: ${e.message}`); }
  }

  logger.info(`Execution ${executionId} completed: ${finalStatus} in ${Math.round(actualDuration / 1000)}s`);
  return { executionId, status: finalStatus, durationMs: Math.round(actualDuration), errorMessage };
}

async function handleExecutionFailure(job, execution, status, errorMessage) {
  const deduplicationKey = `failure:${job._id}:${new Date().toISOString().split('T')[0]}`;
  const existing = await Alert.findOne({ deduplicationKey, status: { $in: ['open', 'acknowledged'] } });

  if (!existing) {
    const type = status === 'timed_out' ? 'execution_timeout' : 'job_failure';
    await Alert.create({
      jobId: job._id,
      workflowId: job.workflowId,
      executionId: execution._id,
      type,
      severity: job.criticality === 'critical' ? 'critical' : job.criticality === 'high' ? 'high' : 'medium',
      title: `${status === 'timed_out' ? 'Timeout' : 'Failure'}: ${job.name}`,
      description: errorMessage || `Job ${job.jobKey} ${status}.`,
      deduplicationKey,
      status: 'open',
    });
  }

  // Mark downstream jobs as blocked
  const downstreamIds = await getDownstreamJobIds(job._id, job.workflowId);
  if (downstreamIds.size > 0) {
    await Job.updateMany(
      { _id: { $in: [...downstreamIds] }, status: { $in: ['pending', 'queued'] } },
      { status: 'blocked', riskLevel: 'critical' }
    );
  }
}

async function triggerDependentJobs(completedJobId) {
  const downstream = await Dependency.find({ upstreamJobId: completedJobId }).lean();
  for (const dep of downstream) {
    const downJob = await Job.findById(dep.downstreamJobId);
    if (!downJob || !downJob.isEnabled) continue;
    // Check all upstream deps of this downstream job are complete
    const upstreamDeps = await Dependency.find({ downstreamJobId: dep.downstreamJobId }).lean();
    const allSatisfied = await Promise.all(upstreamDeps.map(async (d) => {
      const j = await Job.findById(d.upstreamJobId);
      return j && j.lastRunStatus === 'success';
    }));
    if (allSatisfied.every(Boolean) && downJob.status === 'pending') {
      logger.info(`Dependency satisfied; job ${downJob.jobKey} is now eligible to run`);
    }
  }
}

/**
 * Retry a failed execution.
 */
export async function retryExecution(executionId, userId) {
  const execution = await Execution.findById(executionId);
  if (!execution) throw new Error('Execution not found');
  if (!['failed', 'timed_out', 'cancelled'].includes(execution.status)) {
    throw new Error('Only failed, timed_out, or cancelled executions can be retried');
  }

  const job = await Job.findById(execution.jobId);
  const attempts = await Execution.countDocuments({
    jobId: job._id,
    triggerType: { $in: ['retry', 'manual', 'scheduled'] },
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  });

  if (attempts > job.retryLimit) {
    throw new Error(`Retry limit of ${job.retryLimit} reached for job ${job.jobKey}`);
  }

  const newExecution = await createExecution(job._id, 'retry', userId, execution.attemptNumber + 1);
  newExecution.parentExecutionId = executionId;
  await newExecution.save();

  // Run simulation async (don't await in handler)
  simulateExecution(newExecution._id).catch(e => logger.error(`Simulation error: ${e.message}`));
  return newExecution;
}
