import { MonitoringConfig } from '../models/MonitoringConfig.js';
import { createAuditLog, auditFromRequest } from '../services/auditService.js';

export const getSettings = async (req, res, next) => {
  try {
    let config = await MonitoringConfig.findOne({ singleton: true });
    if (!config) {
      config = await MonitoringConfig.create({ singleton: true });
    }
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
};

export const updateSettings = async (req, res, next) => {
  try {
    const allowed = ['prediction', 'scheduler', 'alerts', 'thresholds'];
    const update = { updatedBy: req.userId };
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
    const config = await MonitoringConfig.findOneAndUpdate(
      { singleton: true },
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    );
    await createAuditLog({ ...auditFromRequest(req), action: 'settings.update', resourceType: 'MonitoringConfig', resourceId: config._id, metadata: update });
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
};
