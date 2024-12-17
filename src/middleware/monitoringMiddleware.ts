import { Request, Response, NextFunction } from 'express';
import { metrics } from '../utils/monitoring';
import logger from '../utils/logger';

export const performanceMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Track response time
  res.on('finish', () => {
    const duration = Date.now() - start;
    const path = req.route?.path || req.path;
    
    metrics.apiLatency.labels(path).set(duration);
    
    // Log slow requests (over 1000ms)
    if (duration > 1000) {
      logger.warn('Slow API Request', {
        path,
        duration,
        method: req.method,
        query: req.query,
        userAgent: req.headers['user-agent']
      });
    }
  });

  next();
};