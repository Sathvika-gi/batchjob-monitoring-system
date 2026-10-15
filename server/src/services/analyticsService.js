import { Job } from '../models/Job.js';
import { Execution } from '../models/Execution.js';
import { Workflow } from '../models/Workflow.js';
import { Dependency } from '../models/Dependency.js';

/**
 * Calculate workflow health status from its jobs.
 */
export async function calculateWorkflowHealth(workflowId) {
  const jobs = await Job.find({ workflowId }).lean();
  if (jobs.length === 0) return { health: 'disabled', reason: 'No jobs in workflow', jobStats: {} };

  const enabled = jobs.filter(j => j.isEnabled);
  if (enabled.length === 0) return { health: 'disabled', reason: 'All jobs are disabled', jobStats: {} };

  const statusCounts = {};
  for (const j of jobs) {
    statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;
    if (j.lastRunStatus) {
      statusCounts[`last_${j.lastRunStatus}`] = (statusCounts[`last_${j.lastRunStatus}`] || 0) + 1;
    }
  }

  const failedCount = jobs.filter(j => ['failed', 'timed_out'].includes(j.lastRunStatus)).length;
  const runningCount = jobs.filter(j => j.status === 'running').length;
  const blockedCount = jobs.filter(j => j.status === 'blocked').length;
  const atRiskCount = jobs.filter(j => j.riskLevel === 'high' || j.riskLevel === 'critical').length;
  const criticalFailed = jobs.filter(j =>
    ['failed', 'timed_out'].includes(j.lastRunStatus) && ['critical', 'high'].includes(j.criticality)
  ).length;

  let health, reason;
  if (criticalFailed > 0 || failedCount > jobs.length * 0.3) {
    health = 'failed';
    reason = `${failedCount} job(s) failed${criticalFailed > 0 ? `, including ${criticalFailed} critical job(s)` : ''}`;
  } else if (blockedCount > 0) {
    health = 'impacted';
    reason = `${blockedCount} job(s) are blocked due to upstream failures`;
  } else if (runningCount > 0) {
    health = 'running';
    reason = `${runningCount} job(s) currently executing`;
  } else if (atRiskCount > 0 || failedCount > 0) {
    health = 'at_risk';
    reason = `${atRiskCount} job(s) flagged as at-risk${failedCount > 0 ? `, ${failedCount} recent failure(s)` : ''}`;
  } else {
    health = 'healthy';
    reason = 'All jobs completed successfully';
  }

  const successCount = jobs.filter(j => j.lastRunStatus === 'success').length;

  return {
    health,
    reason,
    jobStats: {
      total: jobs.length,
      enabled: enabled.length,
      running: runningCount,
      success: successCount,
      failed: failedCount,
      blocked: blockedCount,
      atRisk: atRiskCount,
      pending: jobs.filter(j => j.status === 'pending').length,
    },
  };
}

/**
 * Get analytics overview data.
 */
export async function getAnalyticsOverview(startDate, endDate) {
  const dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };
  const execFilter = { startedAt: { $gte: startDate, $lte: endDate } };

  const [totalExecs, statusCounts, avgDuration, topFailing] = await Promise.all([
    Execution.countDocuments(execFilter),
    Execution.aggregate([
      { $match: execFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Execution.aggregate([
      { $match: { ...execFilter, status: 'success', durationMs: { $exists: true } } },
      { $group: { _id: null, avg: { $avg: '$durationMs' }, median: { $avg: '$durationMs' } } },
    ]),
    Execution.aggregate([
      { $match: { ...execFilter, status: 'failed' } },
      { $group: { _id: '$jobId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'jobs', localField: '_id', foreignField: '_id', as: 'job' } },
      { $unwind: '$job' },
      { $project: { jobName: '$job.name', jobKey: '$job.jobKey', failureCount: '$count' } },
    ]),
  ]);

  const byStatus = {};
  for (const s of statusCounts) byStatus[s._id] = s.count;
  const successCount = byStatus.success || 0;
  const failedCount = byStatus.failed || 0;
  const successRate = totalExecs > 0 ? (successCount / totalExecs) : 0;
  const failureRate = totalExecs > 0 ? (failedCount / totalExecs) : 0;

  return {
    totalExecutions: totalExecs,
    byStatus,
    successRate: Math.round(successRate * 1000) / 10,
    failureRate: Math.round(failureRate * 1000) / 10,
    avgDurationMs: avgDuration[0]?.avg ? Math.round(avgDuration[0].avg) : null,
    topFailingJobs: topFailing,
  };
}

/**
 * Get execution trend data grouped by day.
 */
export async function getExecutionTrend(startDate, endDate) {
  const data = await Execution.aggregate([
    { $match: { startedAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$startedAt' } },
          status: '$status',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.date': 1 } },
  ]);

  const byDate = {};
  for (const d of data) {
    const date = d._id.date;
    if (!byDate[date]) byDate[date] = { date, success: 0, failed: 0, running: 0, other: 0 };
    if (d._id.status === 'success') byDate[date].success += d.count;
    else if (d._id.status === 'failed') byDate[date].failed += d.count;
    else if (d._id.status === 'running') byDate[date].running += d.count;
    else byDate[date].other += d.count;
  }
  return Object.values(byDate);
}

/**
 * Get duration trends for a specific job.
 */
export async function getJobDurationTrend(jobId, limit = 30) {
  return Execution.find({
    jobId,
    status: 'success',
    durationMs: { $exists: true },
  }).sort({ completedAt: -1 }).limit(limit).select('completedAt durationMs attemptNumber').lean();
}
