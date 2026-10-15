import { Router } from 'express';
import { authenticate, requireAdmin, requireOperator } from '../middleware/auth.js';
import {
  getJobs, createJob, getJob, updateJob, deleteJob,
  enableJob, disableJob, runJob, retryJob,
  getJobExecutions, getJobDependencies, getJobImpact, getJobPerformance
} from '../controllers/jobController.js';

const router = Router();
router.use(authenticate);

router.get('/', getJobs);
router.post('/', requireOperator, createJob);
router.get('/:id', getJob);
router.patch('/:id', requireOperator, updateJob);
router.delete('/:id', requireAdmin, deleteJob);
router.post('/:id/enable', requireOperator, enableJob);
router.post('/:id/disable', requireOperator, disableJob);
router.post('/:id/run', requireOperator, runJob);
router.post('/:id/retry', requireOperator, retryJob);
router.get('/:id/executions', getJobExecutions);
router.get('/:id/dependencies', getJobDependencies);
router.get('/:id/impact', getJobImpact);
router.get('/:id/performance', getJobPerformance);

export default router;
