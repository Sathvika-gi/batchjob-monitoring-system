import './config/loadEnv.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';

import { config } from './config/config.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import jobRoutes from './routes/jobs.js';
import workflowRoutes from './routes/workflows.js';
import dependencyRoutes from './routes/dependencies.js';
import executionRoutes from './routes/executions.js';
import alertRoutes from './routes/alerts.js';
import healthRoutes from './routes/health.js';
import { analyticsRouter, auditRouter, settingsRouter } from './routes/misc.js';

const app = express();

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());
app.use(requestLogger);

const API = '/api/v1';

// Liveness: process is up (does not require MongoDB)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    version: '1.0.0',
    demoMode: config.demoMode,
  });
});

app.use(`${API}/health`, healthRoutes);
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/jobs`, jobRoutes);
app.use(`${API}/workflows`, workflowRoutes);
app.use(`${API}/dependencies`, dependencyRoutes);
app.use(`${API}/executions`, executionRoutes);
app.use(`${API}/alerts`, alertRoutes);
app.use(`${API}/analytics`, analyticsRouter);
app.use(`${API}/audit-logs`, auditRouter);
app.use(`${API}/settings`, settingsRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
