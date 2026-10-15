import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { getUsers, createUser, getUser, updateUser, updateUserRole, updateUserStatus } from '../controllers/userController.js';

const router = Router();
router.use(authenticate);

router.get('/', requireAdmin, getUsers);
router.post('/', requireAdmin, createUser);
router.get('/:id', getUser);
router.patch('/:id', updateUser);
router.patch('/:id/role', requireAdmin, updateUserRole);
router.patch('/:id/status', requireAdmin, updateUserStatus);

export default router;
