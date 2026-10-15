import mongoose from 'mongoose';

const monitoringConfigSchema = new mongoose.Schema({
  // Singleton document
  singleton: { type: Boolean, default: true, unique: true },
  prediction: {
    enabled: { type: Boolean, default: true },
    minSamples: { type: Number, default: 5 },
    anomalyMultiplier: { type: Number, default: 1.5 },
    lookbackDays: { type: Number, default: 30 },
  },
  scheduler: {
    enabled: { type: Boolean, default: true },
    intervalMs: { type: Number, default: 60000 },
    maxConcurrentJobs: { type: Number, default: 5 },
  },
  alerts: {
    deduplicationWindowMs: { type: Number, default: 3600000 }, // 1 hour
    criticalRetentionDays: { type: Number, default: 90 },
    defaultRetentionDays: { type: Number, default: 30 },
  },
  thresholds: {
    durationAnomalyPercent: { type: Number, default: 50 }, // 50% over expected
    failureRateWarning: { type: Number, default: 0.2 },   // 20% failure rate
    failureRateCritical: { type: Number, default: 0.5 },  // 50% failure rate
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const MonitoringConfig = mongoose.model('MonitoringConfig', monitoringConfigSchema);
