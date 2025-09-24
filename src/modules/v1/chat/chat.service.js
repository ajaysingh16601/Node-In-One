// src/modules/v1/chat/chat.service.js
import { Conversation, Message } from '../../../models/index.js';
import mongoose from 'mongoose';

export async function findOrCreateDirect(aId, bId) {
  // try find existing 1:1 conv
  let conv = await Conversation.findOne({
    type: 'direct',
    participants: { $all: [aId, bId], $size: 2 }
  });
  if (conv) return conv;
  conv = await Conversation.create({ type: 'direct', participants: [aId, bId] });
  return conv;
}

export async function createMessage(conversationId, senderId, { body = '', attachments = [] }) {
  // atomically create message & update conversation lastMessage/updatedAt
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const message = await Message.create([{
      conversation: conversationId,
      sender: senderId,
      body,
      attachments
    }], { session });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message[0]._id,
      updatedAt: new Date()
    }, { session });

    await session.commitTransaction();
    session.endSession();
    return message[0];
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

export async function getMessages(conversationId, { limit = 50, before } = {}) {
  const q = { conversation: conversationId };
  if (before) q.createdAt = { $lt: new Date(before) };
  return Message.find(q).sort({ createdAt: -1 }).limit(limit).lean();
}

export async function markRead(userId, conversationId, messageIds) {
  await Message.updateMany(
    { _id: { $in: messageIds }, conversation: conversationId },
    { $addToSet: { readBy: userId } }
  );
}
