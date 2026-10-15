import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  req.correlationId = uuidv4();
  res.setHeader('X-Correlation-Id', req.correlationId);
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms [${req.correlationId}]`
    );
  });
  next();
};
