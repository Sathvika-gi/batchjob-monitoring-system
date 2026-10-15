import mongoose from 'mongoose';

const dependencySchema = new mongoose.Schema({
  workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true },
  upstreamJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  downstreamJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  dependencyType: { type: String, enum: ['required', 'optional'], default: 'required' },
  description: { type: String, trim: true, maxlength: 500 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Prevent duplicate edges
dependencySchema.index({ workflowId: 1, upstreamJobId: 1, downstreamJobId: 1 }, { unique: true });
dependencySchema.index({ upstreamJobId: 1 });
dependencySchema.index({ downstreamJobId: 1 });
dependencySchema.index({ workflowId: 1 });

export const Dependency = mongoose.model('Dependency', dependencySchema);
