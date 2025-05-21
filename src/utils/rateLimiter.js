// utils/rateLimiter.js

const otpRateLimitStore = new Map();
const MAX_REQUESTS = 3;
const WINDOW_MS = 15 * 60 * 1000;

export const checkRateLimit = (email, type) => {
  const key = `${email}:${type}`;
  const now = Date.now();

  const existing = otpRateLimitStore.get(key) || [];
  const recent = existing.filter(ts => now - ts < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) return false;

  recent.push(now);
  otpRateLimitStore.set(key, recent);
  return true;
};