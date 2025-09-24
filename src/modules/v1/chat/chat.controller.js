// src/modules/v1/chat/chat.controller.js
import * as ChatService from './chat.service.js';
import { Conversation, Message } from '../../../models/index.js';

export async function createConversation(req, res, next) {
  try {
    const { participantIds, type = 'direct', title } = req.body;
    // for direct conversations, canonicalize and reuse findOrCreate
    let conv;
    if (type === 'direct' && participantIds.length === 1) {
      conv = await ChatService.findOrCreateDirect(req.user._id, participantIds[0]);
    } else {
      conv = await Conversation.create({ type, participants: [req.user._id, ...participantIds], title });
    }
    res.json({ ok: true, conversation: conv });
  } catch (err) {
    next(err);
  }
}

export async function listConversations(req, res, next) {
  try {
    const convs = await Conversation.find({ participants: req.user.id }).sort({ updatedAt: -1 }).lean();
    res.json({ ok: true, conversations: convs });
  } catch (err) {
    next(err);
  }
}

export async function getMessages(req, res, next) {
  try {
    const { conversationId } = req.params;
    const { limit = 50, before } = req.query;
    const messages = await ChatService.getMessages(conversationId, { limit: Number(limit), before });
    res.json({ ok: true, messages });
  } catch (err) {
    next(err);
  }
}
