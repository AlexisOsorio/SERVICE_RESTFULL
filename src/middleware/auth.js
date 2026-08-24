const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token Bearer requerido.',
        details: []
      }
    });
  }

  try {
    req.user = jwt.verify(header.substring(7), process.env.JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token inválido o expirado.',
        details: []
      }
    });
  }
};
