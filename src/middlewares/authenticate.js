import { verifyToken } from '../utils/token.js';

export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log('authHeader: ', authHeader);
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};
