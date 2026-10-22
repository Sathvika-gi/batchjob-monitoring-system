import { Execution } from '../models/Execution.js';
import { Job } from '../models/Job.js';
import { Alert } from '../models/Alert.js';
import { Workflow } from '../models/Workflow.js';
import { calculateWorkflowHealth, getAnalyticsOverview, getExecutionTrend } from '../services/analyticsService.js';
import { calculateDurationStats } from '../prediction/predictionService.js';

function getDateRange(range) {
  const now = new Date();
  let start;
  switch (range) {
    case '24h': start = new Date(now - 24 * 3600 * 1000); break;
    case '7d': start = new Date(now - 7 * 24 * 3600 * 1000); break;
    case '30d': default: start = new Date(now - 30 * 24 * 3600 * 1000); break;
  }
  return { start, end: now };
}

export const getOverviewStats = async (req, res, next) => {
  try {
    const range = req.query.range || '24h';
    const { start, end } = getDateRange(range);

    const [totalJobs, allJobs, recentExecs, openAlerts, execCounts] = await Promise.all([
      Job.countDocuments(),
      Job.find().lean(),
      Execution.find({ startedAt: { $gte: start } })
        .populate('jobId', 'name jobKey')
        .populate('workflowId', 'name')
        .sort('-startedAt').limit(20).lean(),
      Alert.countDocuments({ status: 'open' }),
      Execution.aggregate([
        { $match: { startedAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    // Distinct jobs current operational status counts
    let runningJobs = 0;
    let failedJobs = 0;
    let blockedJobs = 0;
    let successfulJobs = 0;
    let pendingJobs = 0;
    let atRiskJobs = 0;

    for (const j of allJobs) {
      if (j.riskLevel === 'high' || j.riskLevel === 'critical') atRiskJobs++;

      if (j.status === 'running') {
        runningJobs++;
      } else if (j.status === 'failed' || j.status === 'timed_out' || j.lastRunStatus === 'failed' || j.lastRunStatus === 'timed_out') {
        failedJobs++;
      } else if (j.status === 'blocked') {
        blockedJobs++;
      } else if (j.status === 'success' || (j.lastRunStatus === 'success' && j.status !== 'blocked')) {
        successfulJobs++;
      } else {
        pendingJobs++;
      }
    }

    const execByStatus = {};
    let totalExecsInWindow = 0;
    for (const s of execCounts) {
      execByStatus[s._id] = s.count;
      totalExecsInWindow += s.count;
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalJobs,
          successfulJobs,
          successfulExecutions: execByStatus.success || 0,
          failedJobs,
          failedExecutions: (execByStatus.failed || 0) + (execByStatus.timed_out || 0),
          runningJobs,
          pendingJobs,
          blockedJobs,
          atRiskJobs,
          openAlerts,
          totalExecutionsInWindow: totalExecsInWindow,
        },
        recentExecutions: recentExecs.slice(0, 10),
      },
    });
  } catch (err) { next(err); }
};

export const getAnalyticsOverviewHandler = async (req, res, next) => {
  try {
    const range = req.query.range || '30d';
    const { start, end } = getDateRange(range);
    const data = await getAnalyticsOverview(start, end);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const getExecutionTrendHandler = async (req, res, next) => {
  try {
    const range = req.query.range || '7d';
    const { start, end } = getDateRange(range);
    const data = await getExecutionTrend(start, end);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const getDurationAnalytics = async (req, res, next) => {
  try {
    const range = req.query.range || '30d';
    const { start } = getDateRange(range);
    const executions = await Execution.find({
      status: 'success',
      startedAt: { $gte: start },
      durationMs: { $exists: true },
    }).populate('jobId', 'name jobKey').sort('-startedAt').lean();

    const byJob = {};
    for (const e of executions) {
      const key = e.jobId?._id?.toString();
      if (!key) continue;
      if (!byJob[key]) byJob[key] = { jobName: e.jobId.name, jobKey: e.jobId.jobKey, durations: [] };
      byJob[key].durations.push(e.durationMs);
    }

    const result = Object.entries(byJob).map(([jobId, d]) => ({
      jobId, jobName: d.jobName, jobKey: d.jobKey,
      stats: calculateDurationStats(d.durations),
    }));

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getFailureAnalytics = async (req, res, next) => {
  try {
    const range = req.query.range || '30d';
    const { start } = getDateRange(range);
    const data = await Execution.aggregate([
      { $match: { status: 'failed', startedAt: { $gte: start } } },
      { $group: { _id: { jobId: '$jobId', date: { $dateToString: { format: '%Y-%m-%d', date: '$startedAt' } } }, count: { $sum: 1 } } },
      { $lookup: { from: 'jobs', localField: '_id.jobId', foreignField: '_id', as: 'job' } },
      { $unwind: '$job' },
      { $project: { date: '$_id.date', jobName: '$job.name', jobKey: '$job.jobKey', count: 1 } },
      { $sort: { date: 1, count: -1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const getWorkflowAnalytics = async (req, res, next) => {
  try {
    const workflows = await Workflow.find().lean();
    const withHealth = await Promise.all(workflows.map(async (w) => {
      const health = await calculateWorkflowHealth(w._id);
      return { id: w._id, name: w.name, criticality: w.criticality, ...health };
    }));
    res.json({ success: true, data: withHealth });
  } catch (err) { next(err); }
};

export const getPredictionAnalytics = async (req, res, next) => {
  try {
    const predictions = await Alert.find({ type: 'predicted_delay', status: { $in: ['open', 'acknowledged'] } })
      .populate('jobId', 'name jobKey criticality').populate('workflowId', 'name').sort('-createdAt').lean();
    res.json({ success: true, data: predictions });
  } catch (err) { next(err); }
};
