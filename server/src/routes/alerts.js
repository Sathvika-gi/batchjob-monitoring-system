import { Router } from 'express';
import { authenticate, requireOperator } from '../middleware/auth.js';
import { getAlerts, getAlert, acknowledgeAlert, resolveAlert, reopenAlert, getAlertCount } from '../controllers/alertController.js';

const router = Router();
router.use(authenticate);

router.get('/count', getAlertCount);
router.get('/', getAlerts);
router.get('/:id', getAlert);
router.post('/:id/acknowledge', requireOperator, acknowledgeAlert);
router.post('/:id/resolve', requireOperator, resolveAlert);
router.post('/:id/reopen', requireOperator, reopenAlert);

export default router;
