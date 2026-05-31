const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// 1. Core Helmet middleware configuration
const secureHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:5000"]
    }
  }
});

const shouldSkipRateLimit = (req) => {
  if (process.env.NODE_ENV === 'test') {
    return true;
  }
  // Bypass rate limiting for localhost in development/non-production
  if (process.env.NODE_ENV !== 'production') {
    const ip = req.ip || req.connection?.remoteAddress || '';
    return (
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip === '::ffff:127.0.0.1' ||
      ip === 'localhost'
    );
  }
  return false;
};

// 2. Rate Limiting: 100 requests per 15 minutes for standard routes
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, 
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit
});

// 3. OCR and AI limiters: More strict to prevent CPU/Token abuse
const resourceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 20, 
  message: {
    success: false,
    message: 'System resource limit reached. OCR scanning and AI queries are capped at 20 requests per 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit
});

/**
 * Strips HTML tags (XSS check), double dots (Path Traversal check) and NoSQL operators recursively
 */
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // 1. Prevent NoSQL Injection: Remove keys starting with $ or containing .
      if (typeof key === 'string' && (key.startsWith('$') || key.includes('.'))) {
        console.warn(`[SECURITY WARNING] Stripping potential NoSQL injection key: "${key}"`);
        continue;
      }

      let val = obj[key];

      if (typeof val === 'string') {
        // 2. Prevent Path Traversal & XSS: Strip double-dots and script/HTML tags
        let cleanVal = val
          .replace(/\.\./g, '') // Strip all double dots
          .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '') // Strip script tags
          .replace(/<[^>]*>/g, '') // Strip general HTML
          .trim();
        
        sanitized[key] = cleanVal;
      } else if (typeof val === 'object' && val !== null) {
        sanitized[key] = sanitizeObject(val);
      } else {
        sanitized[key] = val;
      }
    }
  }
  return sanitized;
};

/**
 * Express middleware to sanitize body, query, and params
 */
const sanitizeInput = (req, res, next) => {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
};

module.exports = {
  secureHeaders,
  standardLimiter,
  resourceLimiter,
  sanitizeInput
};
