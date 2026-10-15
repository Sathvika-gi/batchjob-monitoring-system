import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { getOverviewStats, getAnalyticsOverviewHandler, getExecutionTrendHandler, getDurationAnalytics, getFailureAnalytics, getWorkflowAnalytics, getPredictionAnalytics } from '../controllers/analyticsController.js';
import { getAuditLogs } from '../controllers/auditController.js';
import { getSettings, updateSettings } from '../controllers/settingsController.js';

const analyticsRouter = Router();
analyticsRouter.use(authenticate);
analyticsRouter.get('/overview', getOverviewStats);
analyticsRouter.get('/executions', getAnalyticsOverviewHandler);
analyticsRouter.get('/executions/trend', getExecutionTrendHandler);
analyticsRouter.get('/durations', getDurationAnalytics);
analyticsRouter.get('/failures', getFailureAnalytics);
analyticsRouter.get('/workflows', getWorkflowAnalytics);
analyticsRouter.get('/predictions', getPredictionAnalytics);

const auditRouter = Router();
auditRouter.use(authenticate, requireAdmin);
auditRouter.get('/', getAuditLogs);

const settingsRouter = Router();
settingsRouter.use(authenticate);
settingsRouter.get('/', getSettings);
settingsRouter.patch('/', requireAdmin, updateSettings);

export { analyticsRouter, auditRouter, settingsRouter };
