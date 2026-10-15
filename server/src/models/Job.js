import mongoose from 'mongoose';

const JOB_STATUSES = ['pending', 'queued', 'running', 'success', 'failed', 'cancelled', 'skipped', 'blocked', 'timed_out', 'disabled'];
const JOB_TYPES = ['batch', 'etl', 'report', 'backup', 'sync', 'cleanup', 'notification', 'other'];
const SCHEDULE_TYPES = ['cron', 'interval', 'manual'];
const CRITICALITIES = ['low', 'medium', 'high', 'critical'];

const jobSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  jobKey: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 1000 },
  workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true },
  jobType: { type: String, enum: JOB_TYPES, default: 'batch' },
  scheduleType: { type: String, enum: SCHEDULE_TYPES, default: 'cron' },
  schedule: { type: String, trim: true }, // cron expression or interval spec
  timezone: { type: String, default: 'UTC' },
  expectedDurationMs: { type: Number, default: 300000 }, // 5 min default
  timeoutMs: { type: Number, default: 1800000 }, // 30 min default
  retryLimit: { type: Number, default: 3, min: 0, max: 10 },
  retryDelayMs: { type: Number, default: 60000 },
  criticality: { type: String, enum: CRITICALITIES, default: 'medium' },
  isEnabled: { type: Boolean, default: true },
  status: { type: String, enum: JOB_STATUSES, default: 'pending' },
  lastRunAt: { type: Date },
  lastRunStatus: { type: String, enum: JOB_STATUSES },
  lastDurationMs: { type: Number },
  nextRunAt: { type: Date },
  riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Execution simulation config
  simulationConfig: {
    successRate: { type: Number, default: 0.85, min: 0, max: 1 },
    baseDurationMs: { type: Number },
    variabilityFactor: { type: Number, default: 0.2 },
  },
}, { timestamps: true });

jobSchema.index({ workflowId: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ criticality: 1 });
jobSchema.index({ isEnabled: 1 });
jobSchema.index({ nextRunAt: 1 });

export const Job = mongoose.model('Job', jobSchema);
