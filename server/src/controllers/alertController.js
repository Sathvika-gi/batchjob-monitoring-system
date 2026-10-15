import { Alert } from '../models/Alert.js';
import { AppError } from '../utils/AppError.js';
import { createAuditLog, auditFromRequest } from '../services/auditService.js';

export const getAlerts = async (req, res, next) => {
  try {
    const { severity, type, status, workflowId, jobId, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (severity) filter.severity = severity;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (workflowId) filter.workflowId = workflowId;
    if (jobId) filter.jobId = jobId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      Alert.find(filter)
        .populate('jobId', 'name jobKey criticality')
        .populate('workflowId', 'name')
        .populate('acknowledgedBy', 'name email')
        .populate('resolvedBy', 'name email')
        .sort('-createdAt').skip(skip).limit(parseInt(limit)).lean(),
      Alert.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

export const getAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate('jobId', 'name jobKey criticality')
      .populate('workflowId', 'name')
      .populate('acknowledgedBy', 'name email')
      .populate('resolvedBy', 'name email')
      .lean();
    if (!alert) return next(new AppError('Alert not found.', 404));
    res.json({ success: true, data: alert });
  } catch (err) { next(err); }
};

export const acknowledgeAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return next(new AppError('Alert not found.', 404));
    if (alert.status === 'resolved') return next(new AppError('Cannot acknowledge a resolved alert.', 400));
    alert.status = 'acknowledged';
    alert.acknowledgedBy = req.userId;
    alert.acknowledgedAt = new Date();
    await alert.save();
    await createAuditLog({ ...auditFromRequest(req), action: 'alert.acknowledge', resourceType: 'Alert', resourceId: alert._id });
    res.json({ success: true, data: alert });
  } catch (err) { next(err); }
};

export const resolveAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return next(new AppError('Alert not found.', 404));
    alert.status = 'resolved';
    alert.resolvedBy = req.userId;
    alert.resolvedAt = new Date();
    await alert.save();
    await createAuditLog({ ...auditFromRequest(req), action: 'alert.resolve', resourceType: 'Alert', resourceId: alert._id });
    res.json({ success: true, data: alert });
  } catch (err) { next(err); }
};

export const reopenAlert = async (req, res, next) => {
  try {
    if (req.user.role === 'viewer') return next(new AppError('Not authorized to reopen alerts.', 403));
    const alert = await Alert.findByIdAndUpdate(req.params.id, {
      status: 'open', resolvedBy: null, resolvedAt: null
    }, { new: true });
    if (!alert) return next(new AppError('Alert not found.', 404));
    await createAuditLog({ ...auditFromRequest(req), action: 'alert.reopen', resourceType: 'Alert', resourceId: alert._id });
    res.json({ success: true, data: alert });
  } catch (err) { next(err); }
};

export const getAlertCount = async (req, res, next) => {
  try {
    const counts = await Alert.aggregate([
      { $match: { status: 'open' } },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);
    const result = { total: 0 };
    for (const c of counts) { result[c._id] = c.count; result.total += c.count; }
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};
