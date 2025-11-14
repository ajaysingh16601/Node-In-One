import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';

// Ensure dotenv is loaded
dotenv.config();

const IV_LENGTH = 16;

// Safely check if the environment variable is available
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'e370d98b6da5477c9a4f222ce8df1e1033f79d85d0b62755c5233704243c6082';

if (!ENCRYPTION_KEY) {
  console.warn("Warning: ENCRYPTION_KEY is not set in environment variables. Using default key for development.");
  console.warn("Please set ENCRYPTION_KEY in your .env file for production use.");
}

// Use a default key for development if not set, but this should never be used in production
const ENCRYPTION_KEY_TO_USE = ENCRYPTION_KEY || 'default-development-key-change-this-in-production-minimum-32-chars';

// Hash the key to ensure it's 32 bytes (for AES-256)
const ENCRYPTION_KEY_HASHED = CryptoJS.SHA256(ENCRYPTION_KEY_TO_USE).toString(CryptoJS.enc.Hex);

export const encrypt = (text) => {
  const iv = CryptoJS.lib.WordArray.random(IV_LENGTH);
  const cipherText = CryptoJS.AES.encrypt(text, CryptoJS.enc.Hex.parse(ENCRYPTION_KEY_HASHED), {
    iv,
  }).toString();

  return `${iv.toString()}:${cipherText}`;
};

// Decrypt function
export const decrypt = (text) => {
  const [ivHex, cipherText] = text.split(':');
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const decryptedBytes = CryptoJS.AES.decrypt(cipherText, CryptoJS.enc.Hex.parse(ENCRYPTION_KEY_HASHED), {
    iv,
  });
  return decryptedBytes.toString(CryptoJS.enc.Utf8);
};