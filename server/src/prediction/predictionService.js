import { Execution } from '../models/Execution.js';
import { Job } from '../models/Job.js';
import { Alert } from '../models/Alert.js';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

/**
 * Calculate statistics for a job's execution history.
 * Returns avg, median, p95, stdDev, recentTrend, sampleCount.
 */
export function calculateDurationStats(durations) {
  if (!durations || durations.length === 0) return null;
  const sorted = [...durations].sort((a, b) => a - b);
  const n = sorted.length;
  const avg = sorted.reduce((sum, v) => sum + v, 0) / n;
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  const p95 = n >= 20 ? sorted[Math.floor(0.95 * n)] : null;
  const variance = sorted.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  // IQR-based variability (robust to outliers)
  const q1 = sorted[Math.floor(0.25 * n)];
  const q3 = sorted[Math.floor(0.75 * n)];
  const iqr = q3 - q1;
  return { avg, median, p95, stdDev, iqr, q1, q3, sampleCount: n };
}

/**
 * Predict delay risk for a job using historical execution data.
 * Returns a risk object or null if insufficient data.
 */
export async function predictDelayRisk(job) {
  const minSamples = config.prediction.minSamples;
  const anomalyMultiplier = config.prediction.anomalyMultiplier;

  // Fetch recent successful executions (last 30 days)
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const executions = await Execution.find({
    jobId: job._id,
    status: 'success',
    completedAt: { $gte: cutoff },
    durationMs: { $exists: true, $gt: 0 },
  }).sort({ completedAt: -1 }).limit(50).lean();

  if (executions.length < minSamples) {
    return {
      hasRisk: false,
      insufficientData: true,
      message: `Insufficient history for a reliable prediction. Need at least ${minSamples} successful executions (found ${executions.length}).`,
      sampleCount: executions.length,
    };
  }

  const durations = executions.map(e => e.durationMs);
  const stats = calculateDurationStats(durations);
  const recentDurations = durations.slice(0, Math.min(5, durations.length));
  const recentAvg = recentDurations.reduce((s, v) => s + v, 0) / recentDurations.length;

  // Anomaly: recent average > median * multiplier
  const threshold = stats.median * anomalyMultiplier;
  const hasRisk = recentAvg > threshold;
  const predictedDurationMs = recentAvg;
  const baselineDurationMs = stats.median;

  // Failure rate in recent executions (all statuses)
  const recentAll = await Execution.find({
    jobId: job._id,
    completedAt: { $gte: cutoff },
  }).sort({ completedAt: -1 }).limit(20).lean();

  const recentFailures = recentAll.filter(e => e.status === 'failed').length;
  const recentFailureRate = recentAll.length > 0 ? recentFailures / recentAll.length : 0;

  // Deadline risk
  let deadlineRisk = false;
  let minutesUntilDeadline = null;
  if (job.timeoutMs && predictedDurationMs > job.timeoutMs * 0.9) {
    deadlineRisk = true;
    minutesUntilDeadline = Math.round((job.timeoutMs - predictedDurationMs) / 60000);
  }

  const evidence = {
    sampleCount: executions.length,
    baselineMedianMs: Math.round(stats.median),
    recentAvgMs: Math.round(recentAvg),
    anomalyThresholdMs: Math.round(threshold),
    recentFailureRate: Math.round(recentFailureRate * 100) / 100,
    recentSampleCount: recentDurations.length,
    stdDevMs: Math.round(stats.stdDev),
    iqrMs: Math.round(stats.iqr),
    p95Ms: stats.p95 ? Math.round(stats.p95) : null,
  };

  return {
    hasRisk,
    insufficientData: false,
    predictedDurationMs: Math.round(predictedDurationMs),
    baselineDurationMs: Math.round(baselineDurationMs),
    expectedDurationMs: job.expectedDurationMs,
    overagePercent: Math.round(((recentAvg - stats.median) / stats.median) * 100),
    recentFailureRate,
    deadlineRisk,
    minutesUntilDeadline,
    evidence,
    severity: hasRisk || deadlineRisk
      ? (recentFailureRate > 0.5 || deadlineRisk ? 'critical' : recentFailureRate > 0.2 ? 'high' : 'medium')
      : 'low',
  };
}

/**
 * Generate a predictive alert for a job if conditions warrant it.
 */
export async function generatePredictiveAlert(job) {
  const risk = await predictDelayRisk(job);
  if (!risk || risk.insufficientData || !risk.hasRisk) return null;

  const deduplicationKey = `predict:${job._id}:${new Date().toISOString().split('T')[0]}`;
  const existing = await Alert.findOne({ deduplicationKey, status: { $in: ['open', 'acknowledged'] } });
  if (existing) return null;

  const baselineMin = Math.round(risk.baselineDurationMs / 60000);
  const predictedMin = Math.round(risk.predictedDurationMs / 60000);

  const alert = await Alert.create({
    jobId: job._id,
    workflowId: job.workflowId,
    type: 'predicted_delay',
    severity: risk.severity,
    title: `Predicted delay: ${job.name}`,
    description: `Risk detected: ${job.name} usually takes ${baselineMin} minute(s). Recent execution behavior suggests ${predictedMin} minute(s). This is ${risk.overagePercent}% above baseline.${risk.deadlineRisk ? ` The timeout is ${risk.minutesUntilDeadline} minutes away.` : ''}`,
    evidence: risk.evidence,
    expectedDurationMs: risk.expectedDurationMs,
    predictedDurationMs: risk.predictedDurationMs,
    baselineDurationMs: risk.baselineDurationMs,
    deduplicationKey,
    status: 'open',
  });

  logger.info(`Predictive alert generated for job ${job.jobKey}: ${alert._id}`);
  return alert;
}
