// src/sockets/index.js
import initChatSocket from '../modules/v1/chat/chat.socket.js';
// import initNotificationSocket from './notification.socket.js';
export default function initSockets(io) {
  initChatSocket(io);
  // initNotificationSocket(io);
  // ...other socket features
}