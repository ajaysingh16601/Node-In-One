import TokenStore from '../models/TokenStore.js';
import { verifyToken } from '../utils/token.js';

export const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const blacklisted = await TokenStore.findOne({ token, type: 'access' });
    if (blacklisted) {
        return res.status(401).json({ message: 'Token has been revoked. Please log in again.' });
    }

    try {
        const decoded = await verifyToken(token);
        // Set _id for consistency with Mongoose models
        req.user = { _id: decoded.userId, ...decoded };
        next();
    } catch (err) {
        console.error('JWT verification error:', err);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};