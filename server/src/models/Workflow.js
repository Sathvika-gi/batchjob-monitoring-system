import mongoose from 'mongoose';

const workflowSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 1000 },
  criticality: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  isEnabled: { type: Boolean, default: true },
  deadline: {
    enabled: { type: Boolean, default: false },
    cronExpression: { type: String },
    durationAfterStartMs: { type: Number }, // ms from workflow start until deadline
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tags: [{ type: String, trim: true }],
}, { timestamps: true });

workflowSchema.index({ name: 1 });
workflowSchema.index({ criticality: 1 });
workflowSchema.index({ isEnabled: 1 });

export const Workflow = mongoose.model('Workflow', workflowSchema);
