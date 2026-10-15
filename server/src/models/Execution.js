import mongoose from 'mongoose';

const EXECUTION_STATUSES = ['queued', 'running', 'success', 'failed', 'cancelled', 'skipped', 'blocked', 'timed_out'];
const TRIGGER_TYPES = ['scheduled', 'manual', 'retry', 'dependency'];

const executionSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true },
  status: { type: String, enum: EXECUTION_STATUSES, default: 'queued' },
  triggerType: { type: String, enum: TRIGGER_TYPES, default: 'scheduled' },
  attemptNumber: { type: Number, default: 1, min: 1 },
  scheduledAt: { type: Date },
  startedAt: { type: Date },
  completedAt: { type: Date },
  durationMs: { type: Number },
  errorMessage: { type: String, trim: true, maxlength: 2000 },
  errorStack: { type: String, maxlength: 5000 },
  logs: [{ type: String }],
  triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  parentExecutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Execution' }, // for retries
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

executionSchema.index({ jobId: 1, createdAt: -1 });
executionSchema.index({ workflowId: 1, createdAt: -1 });
executionSchema.index({ status: 1 });
executionSchema.index({ startedAt: -1 });
executionSchema.index({ scheduledAt: 1 });
executionSchema.index({ triggerType: 1 });

export const Execution = mongoose.model('Execution', executionSchema);
