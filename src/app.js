import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { errorHandler } from './middlewares/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import { humanizeString } from 'ajeymanize-text-utils';
import session from 'express-session';
import passport from 'passport';
import './middlewares/googleStrategy.js';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use(session({
    secret: 'dev-secret',
    resave: false,
    saveUninitialized: true,
}));
app.use(passport.initialize());

app.use(passport.session());

app.use('/api/v1/auth', authRoutes);

app.use(errorHandler);

export default app;
