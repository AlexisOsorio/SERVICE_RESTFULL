const rateLimit = require('express-rate-limit');

module.exports = rateLimit({
  windowMs: Number(process.env.V2_RATE_LIMIT_WINDOW_MS || 60000),
  limit: Number(process.env.V2_RATE_LIMIT_MAX || 5),
  standardHeaders: false,
  legacyHeaders: true,
  handler: (req, res) => {
    res.set('X-RateLimit-Limit', String(Number(process.env.V2_RATE_LIMIT_MAX || 5)));
    res.set('Retry-After', '60');
    return res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Demasiadas solicitudes para la versión 2. Intente nuevamente más tarde.',
        details: []
      }
    });
  }
});
