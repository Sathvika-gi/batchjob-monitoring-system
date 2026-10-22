import { Job } from '../models/Job.js';
import { Execution } from '../models/Execution.js';
import { Dependency } from '../models/Dependency.js';
import { AppError } from '../utils/AppError.js';
import { createAuditLog, auditFromRequest } from '../services/auditService.js';
import { createExecution, simulateExecution, retryExecution } from '../engine/executionEngine.js';
import { analyzeRootCause, calculateDownstreamImpact } from '../services/analysisService.js';
import { getWorkflowGraph } from '../services/dependencyService.js';
import { getJobDurationTrend } from '../services/analyticsService.js';
import { calculateDurationStats } from '../prediction/predictionService.js';

const buildFilter = (q) => {
  const f = {};
  if (q.workflowId) f.workflowId = q.workflowId;
  if (q.status) {
    if (q.status === 'at_risk') {
      f.riskLevel = { $in: ['high', 'critical'] };
    } else {
      f.status = q.status;
    }
  }
  if (q.criticality) f.criticality = q.criticality;
  if (q.riskLevel) {
    if (q.riskLevel === 'at_risk') {
      f.riskLevel = { $in: ['high', 'critical'] };
    } else {
      f.riskLevel = q.riskLevel;
    }
  }
  if (q.isEnabled !== undefined) f.isEnabled = q.isEnabled === 'true';
  if (q.search) f.$or = [{ name: new RegExp(q.search, 'i') }, { jobKey: new RegExp(q.search, 'i') }];
  return f;
};

export const getJobs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sort = '-createdAt', ...rest } = req.query;
    const filter = buildFilter(rest);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [jobs, total] = await Promise.all([
      Job.find(filter).populate('workflowId', 'name').sort(sort).skip(skip).limit(parseInt(limit)).lean(),
      Job.countDocuments(filter),
    ]);
    res.json({ success: true, data: jobs, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

export const createJob = async (req, res, next) => {
  try {
    const { name, description, workflowId, jobType, scheduleType, schedule, timezone,
      expectedDurationMs, timeoutMs, retryLimit, retryDelayMs, criticality, isEnabled, simulationConfig } = req.body;
    const jobKey = (name || '').toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').slice(0, 100) + '_' + Date.now().toString(36).toUpperCase();
    const job = await Job.create({
      name, description, workflowId, jobType, scheduleType, schedule, timezone,
      expectedDurationMs, timeoutMs, retryLimit, retryDelayMs, criticality,
      isEnabled: isEnabled !== undefined ? isEnabled : true,
      jobKey, simulationConfig, createdBy: req.userId,
    });
    await createAuditLog({ ...auditFromRequest(req), action: 'job.create', resourceType: 'Job', resourceId: job._id, metadata: { name, workflowId } });
    res.status(201).json({ success: true, data: job });
  } catch (err) { next(err); }
};

export const getJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate('workflowId', 'name criticality').lean();
    if (!job) return next(new AppError('Job not found.', 404));
    res.json({ success: true, data: job });
  } catch (err) { next(err); }
};

export const updateJob = async (req, res, next) => {
  try {
    const allowed = ['name', 'description', 'scheduleType', 'schedule', 'timezone', 'expectedDurationMs',
      'timeoutMs', 'retryLimit', 'retryDelayMs', 'criticality', 'isEnabled', 'simulationConfig', 'jobType'];
    const update = {};
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
    const job = await Job.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).lean();
    if (!job) return next(new AppError('Job not found.', 404));
    await createAuditLog({ ...auditFromRequest(req), action: 'job.update', resourceType: 'Job', resourceId: job._id, metadata: update });
    res.json({ success: true, data: job });
  } catch (err) { next(err); }
};

export const deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return next(new AppError('Job not found.', 404));
    await Dependency.deleteMany({ $or: [{ upstreamJobId: req.params.id }, { downstreamJobId: req.params.id }] });
    await createAuditLog({ ...auditFromRequest(req), action: 'job.delete', resourceType: 'Job', resourceId: req.params.id });
    res.json({ success: true, message: 'Job deleted.' });
  } catch (err) { next(err); }
};

export const enableJob = async (req, res, next) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, { isEnabled: true }, { new: true });
    if (!job) return next(new AppError('Job not found.', 404));
    await createAuditLog({ ...auditFromRequest(req), action: 'job.enable', resourceType: 'Job', resourceId: job._id });
    res.json({ success: true, data: job });
  } catch (err) { next(err); }
};

export const disableJob = async (req, res, next) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, { isEnabled: false }, { new: true });
    if (!job) return next(new AppError('Job not found.', 404));
    await createAuditLog({ ...auditFromRequest(req), action: 'job.disable', resourceType: 'Job', resourceId: job._id });
    res.json({ success: true, data: job });
  } catch (err) { next(err); }
};

export const runJob = async (req, res, next) => {
  try {
    const execution = await createExecution(req.params.id, 'manual', req.userId);
    // Simulate asynchronously
    simulateExecution(execution._id).catch(e => {});
    await createAuditLog({ ...auditFromRequest(req), action: 'job.run', resourceType: 'Job', resourceId: req.params.id });
    res.status(202).json({ success: true, message: 'Job queued for demo execution.', data: execution });
  } catch (err) { next(new AppError(err.message, 400)); }
};

export const retryJob = async (req, res, next) => {
  try {
    const { executionId } = req.body;
    if (!executionId) return next(new AppError('executionId required.', 400));
    const newExec = await retryExecution(executionId, req.userId);
    await createAuditLog({ ...auditFromRequest(req), action: 'job.retry', resourceType: 'Job', resourceId: req.params.id });
    res.status(202).json({ success: true, data: newExec });
  } catch (err) { next(new AppError(err.message, 400)); }
};

export const getJobExecutions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      Execution.find({ jobId: req.params.id }).sort('-createdAt').skip(skip).limit(parseInt(limit)).lean(),
      Execution.countDocuments({ jobId: req.params.id }),
    ]);
    res.json({ success: true, data, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

export const getJobDependencies = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).lean();
    if (!job) return next(new AppError('Job not found.', 404));
    const [upstream, downstream] = await Promise.all([
      Dependency.find({ downstreamJobId: req.params.id }).populate('upstreamJobId', 'name status criticality jobKey').lean(),
      Dependency.find({ upstreamJobId: req.params.id }).populate('downstreamJobId', 'name status criticality jobKey').lean(),
    ]);
    res.json({ success: true, data: { upstream, downstream } });
  } catch (err) { next(err); }
};

export const getJobImpact = async (req, res, next) => {
  try {
    const impact = await calculateDownstreamImpact(req.params.id);
    res.json({ success: true, data: impact });
  } catch (err) { next(new AppError(err.message, 400)); }
};

export const getJobPerformance = async (req, res, next) => {
  try {
    const executions = await getJobDurationTrend(req.params.id);
    const durations = executions.filter(e => e.durationMs).map(e => e.durationMs);
    const stats = calculateDurationStats(durations);
    res.json({ success: true, data: { stats, history: executions.reverse() } });
  } catch (err) { next(err); }
};
