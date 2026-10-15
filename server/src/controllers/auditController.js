import { AuditLog } from '../models/AuditLog.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const { actorId, action, resourceType, resourceId, startDate, endDate, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (actorId) filter.actorId = actorId;
    if (action) filter.action = new RegExp(action, 'i');
    if (resourceType) filter.resourceType = resourceType;
    if (resourceId) filter.resourceId = resourceId;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      AuditLog.find(filter).populate('actorId', 'name email role').sort('-timestamp').skip(skip).limit(parseInt(limit)).lean(),
      AuditLog.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};
