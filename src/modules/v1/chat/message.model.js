// src/modules/v1/chat/message.model.js
import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const AttachmentSchema = new Schema({
  url: String,
  name: String,
  size: Number,
}, { _id: false });

const MessageSchema = new Schema({
  conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, default: '' },
  attachments: [AttachmentSchema],
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  deliveredTo: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

MessageSchema.index({ conversation: 1, createdAt: -1 });

export default model('Message', MessageSchema);
