const logger = require('../config/logger');

module.exports = function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    logger.info('HTTP request', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip,
      userId: req.user?.id,
    });
  });

  next();
};
