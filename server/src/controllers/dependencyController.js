import { Dependency } from '../models/Dependency.js';
import { AppError } from '../utils/AppError.js';
import { validateDependency } from '../services/dependencyService.js';
import { createAuditLog, auditFromRequest } from '../services/auditService.js';

export const createDependency = async (req, res, next) => {
  try {
    const { workflowId, upstreamJobId, downstreamJobId, dependencyType, description } = req.body;
    if (!workflowId || !upstreamJobId || !downstreamJobId) {
      return next(new AppError('workflowId, upstreamJobId, and downstreamJobId are required.', 400));
    }
    await validateDependency(workflowId, upstreamJobId, downstreamJobId);
    const dep = await Dependency.create({ workflowId, upstreamJobId, downstreamJobId, dependencyType, description, createdBy: req.userId });
    await createAuditLog({ ...auditFromRequest(req), action: 'dependency.create', resourceType: 'Dependency', resourceId: dep._id, metadata: { workflowId, upstreamJobId, downstreamJobId } });
    res.status(201).json({ success: true, data: dep });
  } catch (err) {
    if (err.code === 'CYCLE_DETECTED' || err.isOperational) return next(err);
    if (err.code === 11000) return next(new AppError('This dependency already exists.', 409));
    next(err);
  }
};

export const updateDependency = async (req, res, next) => {
  try {
    const { dependencyType, description } = req.body;
    const dep = await Dependency.findByIdAndUpdate(req.params.id, { dependencyType, description }, { new: true });
    if (!dep) return next(new AppError('Dependency not found.', 404));
    res.json({ success: true, data: dep });
  } catch (err) { next(err); }
};

export const deleteDependency = async (req, res, next) => {
  try {
    const dep = await Dependency.findByIdAndDelete(req.params.id);
    if (!dep) return next(new AppError('Dependency not found.', 404));
    await createAuditLog({ ...auditFromRequest(req), action: 'dependency.delete', resourceType: 'Dependency', resourceId: req.params.id });
    res.json({ success: true, message: 'Dependency removed.' });
  } catch (err) { next(err); }
};
