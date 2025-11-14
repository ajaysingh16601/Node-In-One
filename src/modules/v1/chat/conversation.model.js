// src/modules/v1/chat/conversation.model.js
import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const ConversationSchema = new Schema({
  type: { type: String, enum: ['direct','group'], default: 'direct' },
  title: { type: String },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

ConversationSchema.index({ participants: 1, updatedAt: -1 });

export default model('Conversation', ConversationSchema);
