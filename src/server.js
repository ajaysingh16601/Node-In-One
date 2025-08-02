// src/server.js

import mongoose from 'mongoose';
import app from './app.js';
import { config } from './config/env.js';

const startServer = async () => {
    try {
        await mongoose.connect(config.dbUri);
        console.log('MongoDB connected');

        app.listen(config.port, () => {
            console.log(`Server running at ${config.port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
    }
};

startServer();