// src/middlewares/socketAuth.js
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import User from '../modules/v1/user/user.model.js';

export default async function socketAuth(socket, next) {
  try {
    const token = socket.handshake?.auth?.token ||
                  (socket.handshake?.headers?.authorization || '').replace(/^Bearer\s/, '');

    if (!token) {
      return next(new Error('NO_TOKEN'));
    }

    let payload;
    try {
      payload = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      return next(new Error('AUTH_ERROR'));
    }

    // Accept several claim names (sub, userId, user_id)
    const userId = payload.sub || payload.userId || payload.user_id || payload.id;
    if (!userId) {
      return next(new Error('AUTH_ERROR'));
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return next(new Error('USER_NOT_FOUND'));
    }
    if (user.isDeleted) {
      return next(new Error('ACCOUNT_DELETED'));
    }

    socket.data.user = { id: String(user._id), name: user.name || user.email || 'User' };
    socket.join(`user:${user._id}`);
    return next();
  } catch (err) {
    console.error('Socket auth unexpected error', err);
    return next(new Error('AUTH_ERROR'));
  }
}
