import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../utils/logger.js';

export async function createAuditLog({
  actorId, actorEmail, actorRole,
  action, resourceType, resourceId,
  metadata = {}, correlationId, ipAddress, userAgent,
}) {
  try {
    await AuditLog.create({
      actorId,
      actorEmail,
      actorRole,
      action,
      resourceType,
      resourceId: resourceId ? resourceId.toString() : null,
      metadata,
      correlationId,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });
  } catch (err) {
    // Never fail the main request due to audit log errors
    logger.warn(`Audit log creation failed: ${err.message}`);
  }
}

export function auditFromRequest(req) {
  return {
    actorId: req.userId,
    actorEmail: req.user?.email,
    actorRole: req.user?.role,
    correlationId: req.correlationId,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  };
}
