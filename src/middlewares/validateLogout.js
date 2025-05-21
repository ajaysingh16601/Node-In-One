export const validateLogout = (req, res, next) => {
    const { refreshToken } = req.body;
    if (!refreshToken || typeof refreshToken !== 'string') {
        return res.status(400).json({ message: 'Valid refresh token is required' });
    }
    next();
};