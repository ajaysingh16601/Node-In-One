import express from 'express';
import authRoutes from '../../modules/v1/auth/auth.routes.js';
import userRoutes from '../../modules/v1/user/user.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
// router.use('/tasks', taskRoutes);

export default router;
