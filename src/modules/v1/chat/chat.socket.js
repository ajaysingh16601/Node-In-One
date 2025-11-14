// src/modules/v1/chat/chat.socket.js
import socketAuth from '../../../middlewares/socketAuth.js';
import { Conversation, Message } from '../../../models/index.js';
import * as ChatService from './chat.service.js';
import { CHAT_EVENTS } from '../../../constants/chat.constants.js';

export default function initChatSocket(io) {
//   io.use(socketAuth);

  io.on('connection', (socket) => {
    const me = socket.data.user;

    // optional: on connect, you could join top conversations or send unread counts
    socket.on('join_conversation', async ({ conversationId }, ack) => {
      try {
        const conv = await Conversation.findById(conversationId).lean();
        if (!conv || !conv.participants.map(String).includes(me.id)) {
          return ack?.({ ok: false, error: 'NOT_ALLOWED' });
        }
        socket.join(`conversation:${conversationId}`);
        return ack?.({ ok: true });
      } catch (err) {
        return ack?.({ ok: false, error: 'SERVER_ERROR' });
      }
    });

    // send message (with ack)
    socket.on('send_message', async ({ conversationId, body, tempId, attachments = [] }, ack) => {
      try {
        const conv = await Conversation.findById(conversationId).lean();
        if (!conv || !conv.participants.map(String).includes(me.id)) {
          return ack?.({ ok: false, error: 'NOT_ALLOWED' });
        }

        const msg = await ChatService.createMessage(conversationId, me.id, { body, attachments });

        // populate sender info to send to clients (minimal)
        const payload = {
          _id: msg._id,
          conversation: msg.conversation,
          sender: { _id: me.id, name: me.name },
          body: msg.body,
          attachments: msg.attachments,
          createdAt: msg.createdAt
        };

        // emit to conversation room
        io.to(`conversation:${conversationId}`).emit(CHAT_EVENTS.MESSAGE, payload);

        // ack the sender with server id (allows client to reconcile tempId)
        ack?.({ ok: true, message: payload, tempId });
      } catch (err) {
        ack?.({ ok: false, error: 'SERVER_ERROR' });
      }
    });

    // typing indicator
    socket.on('typing', ({ conversationId, isTyping }) => {
      socket.to(`conversation:${conversationId}`).emit(CHAT_EVENTS.TYPING, {
        userId: me.id,
        isTyping
      });
    });

    // mark read
    socket.on('mark_read', async ({ conversationId, messageIds }, ack) => {
      try {
        await ChatService.markRead(me.id, conversationId, messageIds);
        io.to(`conversation:${conversationId}`).emit(CHAT_EVENTS.READ, { userId: me.id, messageIds });
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: 'SERVER_ERROR' });
      }
    });

    // disconnect -> update presence/lastSeen if you want
    socket.on('disconnect', async (reason) => {
      // optional: update user lastSeen timestamp in DB
      // notify followers / participants
    });
  });
}
