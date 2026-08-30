const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const createLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { success: false, message: message || 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const authLimiter = createLimiter(
  env.security.rateLimitWindowMs,
  parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 10,
  'Too many authentication attempts, please try again later.'
);

const generalLimiter = createLimiter(
  env.security.rateLimitWindowMs,
  env.security.rateLimitMaxRequests,
  'Too many requests, please try again later.'
);

module.exports = { authLimiter, generalLimiter };