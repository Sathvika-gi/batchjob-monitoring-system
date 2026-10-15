import { Router } from 'express';
import { authenticate, requireOperator } from '../middleware/auth.js';
import { getExecutions, getExecution, retryExecutionHandler, cancelExecution, getExecutionLogs, exportExecutions } from '../controllers/executionController.js';

const router = Router();
router.use(authenticate);

router.get('/export', exportExecutions);
router.get('/', getExecutions);
router.get('/:id', getExecution);
router.post('/:id/retry', requireOperator, retryExecutionHandler);
router.post('/:id/cancel', requireOperator, cancelExecution);
router.get('/:id/logs', getExecutionLogs);

export default router;
