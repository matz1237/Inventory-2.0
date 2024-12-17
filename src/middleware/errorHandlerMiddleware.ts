import { AppError } from '../utils/errorTypes';
import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        type: err.type,
        message: err.message
      });
    }
  
    // Default error response
    return res.status(500).json({
      type: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    });
  };