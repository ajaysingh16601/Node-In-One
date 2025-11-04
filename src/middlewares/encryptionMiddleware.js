import { decrypt, encrypt } from '../utils/encryption.js';

export const encryptionMiddleware = (req, res, next) => {
  // Store original response methods
  const originalJson = res.json;

  // Decrypt incoming request body if encrypted
  if (req.body && req.headers['x-encrypted']) {
    try {
      req.body = JSON.parse(decrypt(req.body.data));
    } catch (error) {
      console.error('Decryption error:', error);
      res.status(400).json({ message: 'Invalid encrypted payload' });
      return;
    }
  }

  // Override response methods to encrypt outgoing data
  res.json = function (data) {
    if (req.headers['x-encrypted']) {
      return originalJson.call(this, {
        data: encrypt(JSON.stringify(data)),
      });
    }
    return originalJson.call(this, data);
  };

  next();
};