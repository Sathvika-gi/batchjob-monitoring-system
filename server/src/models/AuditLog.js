import mongoose from 'mongoose';

const ACTIONS = [
  'auth.login', 'auth.logout',
  'job.create', 'job.update', 'job.delete', 'job.enable', 'job.disable',
  'job.run', 'job.retry', 'job.cancel',
  'workflow.create', 'workflow.update', 'workflow.delete',
  'dependency.create', 'dependency.delete',
  'execution.retry', 'execution.cancel',
  'alert.acknowledge', 'alert.resolve', 'alert.reopen',
  'user.create', 'user.update', 'user.role_change', 'user.status_change',
  'settings.update',
];

const auditLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorEmail: { type: String },  // Snapshot in case user is deleted
  actorRole: { type: String },
  action: { type: String, required: true },
  resourceType: { type: String, required: true },
  resourceId: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  correlationId: { type: String },
  ipAddress: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: false });

auditLogSchema.index({ actorId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ timestamp: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
