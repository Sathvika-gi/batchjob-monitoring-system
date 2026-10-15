import { Router } from 'express';
import { authenticate, requireOperator } from '../middleware/auth.js';
import { createDependency, updateDependency, deleteDependency } from '../controllers/dependencyController.js';

const router = Router();
router.use(authenticate);
router.post('/', requireOperator, createDependency);
router.patch('/:id', requireOperator, updateDependency);
router.delete('/:id', requireOperator, deleteDependency);

export default router;
