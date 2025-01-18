import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const logRequest = (req: Request, res: Response, next: NextFunction) => {
  logger.info(`Request Method: ${req.method}, Request URL: ${req.originalUrl}, Request Body: ${JSON.stringify(req.body)}`);
  next();
}; 