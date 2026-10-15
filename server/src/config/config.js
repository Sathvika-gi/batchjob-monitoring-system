import './loadEnv.js';

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  demoMode: process.env.DEMO_MODE === 'true',
  logLevel: process.env.LOG_LEVEL || 'info',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  prediction: {
    minSamples: parseInt(process.env.PREDICTION_MIN_SAMPLES || '5', 10),
    anomalyMultiplier: parseFloat(process.env.PREDICTION_ANOMALY_MULTIPLIER || '1.5'),
  },
  schedulerIntervalMs: parseInt(process.env.SCHEDULER_INTERVAL_MS || '60000', 10),
};
