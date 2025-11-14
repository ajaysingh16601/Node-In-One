import rateLimit from 'express-rate-limit';

// Rate limit monitoring middleware
export const rateLimitMonitoring = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Security monitoring middleware
export const securityMonitoringMiddleware = (req, res, next) => {
  // Log security-relevant information
  const securityInfo = {
    timestamp: new Date().toISOString(),
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    method: req.method,
    url: req.url,
    encrypted: !!req.headers['x-encrypted'],
  };

  // You can add more security monitoring logic here
  console.log('Security Monitor:', securityInfo);

  // Check for suspicious patterns
  if (req.url.includes('..') || req.url.includes('<script>')) {
    console.warn('Suspicious request detected:', securityInfo);
    return res.status(400).json({ error: 'Invalid request' });
  }

  next();
};