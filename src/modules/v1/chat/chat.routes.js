// src/modules/v1/chat/chat.routes.js
import express from 'express';
import * as ChatController from './chat.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';
// import { jwtAuthMiddleware } from '../../../middlewares/jwtAuth.js'; // your existing middleware used for REST

const router = express.Router();

router.use(authenticate);
router.post('/conversations', ChatController.createConversation);
router.get('/conversations', ChatController.listConversations);
router.get('/conversations/:conversationId/messages', ChatController.getMessages);

export default router;
