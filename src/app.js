// src/app.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import passport from 'passport';

import { errorHandler } from './middlewares/errorHandler.js';
import { encryptionMiddleware } from './middlewares/encryptionMiddleware.js';
import { securityMonitoringMiddleware, rateLimitMonitoring } from './middlewares/securityMonitoring.js';
import v1Routes from './routes/v1/index.js';
import './middlewares/googleStrategy.js';
import { humanizeString } from 'ajeymanize-text-utils';
import { config } from './config/env.js';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// set EJS as view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware setup
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Add security and encryption middleware
app.use(rateLimitMonitoring); // Rate limit monitoring
app.use(securityMonitoringMiddleware); // Security monitoring
app.use(encryptionMiddleware); // Encryption/Decryption middleware

// Session for OAuth (Google login)
app.use(session({
    secret: config.devSecret,
    resave: false,
    saveUninitialized: true,
}));

app.use(passport.initialize());

app.use(passport.session());

// Add error handling middleware for encryption and general errors
app.use((err, req, res, next) => {
    console.error('Error stack:', err.stack);
    
    // Handle encryption-specific errors
    if (err.message && err.message.includes('encryption')) {
        return res.status(400).json({ error: 'Encryption error occurred' });
    }
    
    // Handle other errors
    res.status(500).json({ error: 'Something broke!' });
});

// API base path
app.use('/api/v1', v1Routes);

// Global error handler
app.use(errorHandler);

export default app;
