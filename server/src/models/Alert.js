import mongoose from 'mongoose';

const ALERT_TYPES = ['job_failure', 'predicted_delay', 'execution_timeout', 'duration_anomaly', 'dependency_failure', 'workflow_deadline_risk'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const ALERT_STATUSES = ['open', 'acknowledged', 'resolved'];

const alertSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow' },
  executionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Execution' },
  type: { type: String, enum: ALERT_TYPES, required: true },
  severity: { type: String, enum: SEVERITIES, required: true },
  title: { type: String, required: true, trim: true, maxlength: 300 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  evidence: { type: mongoose.Schema.Types.Mixed }, // JSON with prediction evidence
  status: { type: String, enum: ALERT_STATUSES, default: 'open' },
  // Prediction fields
  expectedDurationMs: { type: Number },
  predictedDurationMs: { type: Number },
  baselineDurationMs: { type: Number },
  // Acknowledgement
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acknowledgedAt: { type: Date },
  // Resolution
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  // Deduplication key
  deduplicationKey: { type: String, index: true },
}, { timestamps: true });

alertSchema.index({ status: 1, severity: -1 });
alertSchema.index({ jobId: 1, status: 1 });
alertSchema.index({ workflowId: 1 });
alertSchema.index({ type: 1 });
alertSchema.index({ createdAt: -1 });

export const Alert = mongoose.model('Alert', alertSchema);
