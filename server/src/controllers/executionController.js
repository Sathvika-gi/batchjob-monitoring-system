import { Execution } from '../models/Execution.js';
import { Job } from '../models/Job.js';
import { AppError } from '../utils/AppError.js';
import { retryExecution } from '../engine/executionEngine.js';
import { createAuditLog, auditFromRequest } from '../services/auditService.js';

export const getExecutions = async (req, res, next) => {
  try {
    const { jobId, workflowId, status, triggerType, startDate, endDate, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const filter = {};
    if (jobId) filter.jobId = jobId;
    if (workflowId) filter.workflowId = workflowId;
    if (status) filter.status = status;
    if (triggerType) filter.triggerType = triggerType;
    if (startDate || endDate) {
      filter.startedAt = {};
      if (startDate) filter.startedAt.$gte = new Date(startDate);
      if (endDate) filter.startedAt.$lte = new Date(endDate);
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      Execution.find(filter).populate('jobId', 'name jobKey').populate('workflowId', 'name').sort(sort).skip(skip).limit(parseInt(limit)).lean(),
      Execution.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

export const getExecution = async (req, res, next) => {
  try {
    const exec = await Execution.findById(req.params.id)
      .populate('jobId', 'name jobKey criticality workflowId')
      .populate('workflowId', 'name')
      .populate('triggeredBy', 'name email')
      .lean();
    if (!exec) return next(new AppError('Execution not found.', 404));
    res.json({ success: true, data: exec });
  } catch (err) { next(err); }
};

export const retryExecutionHandler = async (req, res, next) => {
  try {
    const newExec = await retryExecution(req.params.id, req.userId);
    await createAuditLog({ ...auditFromRequest(req), action: 'execution.retry', resourceType: 'Execution', resourceId: req.params.id });
    res.status(202).json({ success: true, data: newExec });
  } catch (err) { next(new AppError(err.message, 400)); }
};

export const cancelExecution = async (req, res, next) => {
  try {
    const exec = await Execution.findById(req.params.id);
    if (!exec) return next(new AppError('Execution not found.', 404));
    if (!['queued', 'running'].includes(exec.status)) {
      return next(new AppError('Only queued or running executions can be cancelled.', 400));
    }
    exec.status = 'cancelled';
    exec.completedAt = new Date();
    await exec.save();
    await Job.findByIdAndUpdate(exec.jobId, { status: 'cancelled' });
    await createAuditLog({ ...auditFromRequest(req), action: 'execution.cancel', resourceType: 'Execution', resourceId: req.params.id });
    res.json({ success: true, data: exec });
  } catch (err) { next(err); }
};

export const getExecutionLogs = async (req, res, next) => {
  try {
    const exec = await Execution.findById(req.params.id).select('logs status jobId').lean();
    if (!exec) return next(new AppError('Execution not found.', 404));
    res.json({ success: true, data: { logs: exec.logs || [], status: exec.status } });
  } catch (err) { next(err); }
};

export const exportExecutions = async (req, res, next) => {
  try {
    const { jobId, workflowId, status, startDate, endDate } = req.query;
    const filter = {};
    if (jobId) filter.jobId = jobId;
    if (workflowId) filter.workflowId = workflowId;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.startedAt = {};
      if (startDate) filter.startedAt.$gte = new Date(startDate);
      if (endDate) filter.startedAt.$lte = new Date(endDate);
    }
    const executions = await Execution.find(filter).populate('jobId', 'name jobKey').populate('workflowId', 'name').sort('-startedAt').limit(5000).lean();
    const header = 'executionId,jobName,jobKey,workflowName,status,triggerType,attemptNumber,startedAt,completedAt,durationMs,errorMessage\n';
    const rows = executions.map(e =>
      [e._id, e.jobId?.name || '', e.jobId?.jobKey || '', e.workflowId?.name || '', e.status, e.triggerType, e.attemptNumber,
       e.startedAt || '', e.completedAt || '', e.durationMs || '', (e.errorMessage || '').replace(/,/g, ';')].join(',')
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=executions.csv');
    res.send(header + rows);
  } catch (err) { next(err); }
};
