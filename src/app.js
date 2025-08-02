// src/app.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import passport from 'passport';

import { errorHandler } from './middlewares/errorHandler.js';
import v1Routes from './routes/v1/index.js';
import './middlewares/googleStrategy.js';
// import { humanizeString } from 'ajeymanize-text-utils';
import { config } from './config/env.js';

const app = express();

// Middleware setup
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Session for OAuth (Google login)
app.use(session({
    secret: config.devSecret,
    resave: false,
    saveUninitialized: true,
}));

app.use(passport.initialize());

app.use(passport.session());

// API base path
app.use('/api/v1', v1Routes);

// Global error handler
app.use(errorHandler);

export default app;
