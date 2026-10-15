import { Router } from 'express';
import { authenticate, requireAdmin, requireOperator } from '../middleware/auth.js';
import { getWorkflows, createWorkflow, getWorkflow, updateWorkflow, deleteWorkflow, getWorkflowHealth, getWorkflowImpact } from '../controllers/workflowController.js';
import { getWorkflowGraph } from '../services/dependencyService.js';
import { AppError } from '../utils/AppError.js';

const router = Router();
router.use(authenticate);

router.get('/', getWorkflows);
router.post('/', requireOperator, createWorkflow);
router.get('/:id', getWorkflow);
router.patch('/:id', requireOperator, updateWorkflow);
router.delete('/:id', requireAdmin, deleteWorkflow);
router.get('/:id/graph', async (req, res, next) => {
  try {
    const graph = await getWorkflowGraph(req.params.id);
    res.json({ success: true, data: graph });
  } catch (err) { next(err); }
});
router.get('/:id/health', getWorkflowHealth);
router.get('/:id/impact', getWorkflowImpact);

export default router;
