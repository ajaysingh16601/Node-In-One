// src/server.js
import { createServer } from 'http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import app from './app.js';
import { config } from './config/env.js';
import socketAuth from './middlewares/socketAuth.js';
import initSockets from './sockets/index.js';

const server = createServer(app);

const io = new Server(server, {
  cors: { 
    origin: true, 
    credentials: true 
  },
  pingInterval: 25000,
  pingTimeout: 5000,
});

// Async IIFE for startup
(async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.dbUri);
    console.log('MongoDB connected');

    // Set up Redis adapter if Redis URL is configured
    if (config.redisUrl) {
      const pubClient = createClient({ url: config.redisUrl });
      const subClient = pubClient.duplicate();
      
      await pubClient.connect();
      await subClient.connect();
      
      io.adapter(createAdapter(pubClient, subClient));
      console.log('Redis adapter attached');
    }

    // Add socket authentication middleware
    io.use(socketAuth);

    // Initialize all socket handlers
    initSockets(io);
    io.on('connection_error', (err) => {
  console.warn('Global socket connection_error', err);
});

    // Start server
    server.listen(config.port, () => {
      console.log(`Server running at port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();