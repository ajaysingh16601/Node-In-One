// src\routes\v1\index.js
import express from 'express';
import authRoutes from '../../modules/v1/auth/auth.routes.js';
import userRoutes from '../../modules/v1/user/user.routes.js';
import chatRoutes from '../../modules/v1/chat/chat.routes.js';
import jobRoutes from './jobRoutes.js';
import { config } from '../../config/env.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/chat', chatRoutes);
router.use('/jobs', jobRoutes);
// router.use('/tasks', taskRoutes);

router.get('/chat-demo', (req, res) => {
  const token = req.query.token || '';
  let currentUserId = '';
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwt.secret);
      currentUserId = payload.sub || payload.userId || payload.user_id || payload.id || '';
    } catch (err) {
      // token invalid/expired — we still render but client will see auth error
      currentUserId = '';
    }
  }
  res.render('chat', { token, currentUserId });
});

export default router;
