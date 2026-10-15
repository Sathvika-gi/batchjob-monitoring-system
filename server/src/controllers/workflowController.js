import { Workflow } from '../models/Workflow.js';
import { Job } from '../models/Job.js';
import { Execution } from '../models/Execution.js';
import { AppError } from '../utils/AppError.js';
import { createAuditLog, auditFromRequest } from '../services/auditService.js';
import { getWorkflowGraph } from '../services/dependencyService.js';
import { calculateWorkflowHealth } from '../services/analyticsService.js';
import { calculateDownstreamImpact } from '../services/analysisService.js';

export const getWorkflows = async (req, res, next) => {
  try {
    const { search, criticality, isEnabled, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (search) filter.name = new RegExp(search, 'i');
    if (criticality) filter.criticality = criticality;
    if (isEnabled !== undefined) filter.isEnabled = isEnabled === 'true';
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [workflows, total] = await Promise.all([
      Workflow.find(filter).sort('-createdAt').skip(skip).limit(parseInt(limit)).lean(),
      Workflow.countDocuments(filter),
    ]);
    // Attach health for each
    const withHealth = await Promise.all(workflows.map(async (w) => {
      const health = await calculateWorkflowHealth(w._id);
      return { ...w, health: health.health, healthReason: health.reason, jobStats: health.jobStats };
    }));
    res.json({ success: true, data: withHealth, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

export const createWorkflow = async (req, res, next) => {
  try {
    const { name, description, criticality, isEnabled, deadline, tags } = req.body;
    const workflow = await Workflow.create({ name, description, criticality, isEnabled, deadline, tags, createdBy: req.userId });
    await createAuditLog({ ...auditFromRequest(req), action: 'workflow.create', resourceType: 'Workflow', resourceId: workflow._id, metadata: { name } });
    res.status(201).json({ success: true, data: workflow });
  } catch (err) { next(err); }
};

export const getWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findById(req.params.id).lean();
    if (!workflow) return next(new AppError('Workflow not found.', 404));
    const [health, jobs] = await Promise.all([
      calculateWorkflowHealth(req.params.id),
      Job.find({ workflowId: req.params.id }).lean(),
    ]);
    res.json({ success: true, data: { ...workflow, health: health.health, healthReason: health.reason, jobStats: health.jobStats, jobs } });
  } catch (err) { next(err); }
};

export const updateWorkflow = async (req, res, next) => {
  try {
    const { name, description, criticality, isEnabled, deadline, tags } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (criticality !== undefined) update.criticality = criticality;
    if (isEnabled !== undefined) update.isEnabled = isEnabled;
    if (deadline !== undefined) update.deadline = deadline;
    if (tags !== undefined) update.tags = tags;
    const workflow = await Workflow.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).lean();
    if (!workflow) return next(new AppError('Workflow not found.', 404));
    await createAuditLog({ ...auditFromRequest(req), action: 'workflow.update', resourceType: 'Workflow', resourceId: workflow._id, metadata: update });
    res.json({ success: true, data: workflow });
  } catch (err) { next(err); }
};

export const deleteWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findByIdAndDelete(req.params.id);
    if (!workflow) return next(new AppError('Workflow not found.', 404));
    await createAuditLog({ ...auditFromRequest(req), action: 'workflow.delete', resourceType: 'Workflow', resourceId: req.params.id });
    res.json({ success: true, message: 'Workflow deleted.' });
  } catch (err) { next(err); }
};

export const getWorkflowGraphHandler = async (req, res, next) => {
  try {
    const { default: _, ...graphService } = await import('../services/dependencyService.js');
    const graph = await graphService.getWorkflowGraph(req.params.id);
    res.json({ success: true, data: graph });
  } catch (err) { next(err); }
};

export const getWorkflowHealth = async (req, res, next) => {
  try {
    const health = await calculateWorkflowHealth(req.params.id);
    res.json({ success: true, data: health });
  } catch (err) { next(err); }
};

export const getWorkflowImpact = async (req, res, next) => {
  try {
    const jobs = await Job.find({ workflowId: req.params.id, lastRunStatus: { $in: ['failed', 'timed_out'] } }).lean();
    const impacts = await Promise.all(jobs.map(j => calculateDownstreamImpact(j._id)));
    res.json({ success: true, data: impacts });
  } catch (err) { next(err); }
};
