import { Request, Response, NextFunction } from 'express';
import { FingerprintService } from '../services/fingerprintService';
import { AppError, ErrorType } from '../utils/errorTypes';

export async function deviceTrackingMiddleware(req: Request,res: Response,next: NextFunction): Promise<void> {
  try {
    const fingerprint = await FingerprintService.generateFingerprint(req);
    const ip = String(req.ip ?? '');
    const userAgent = String(req.headers['user-agent'] ?? '');
    
    // Explicitly type the request
    (req as Request).deviceInfo = {
      fingerprint,
      ip,
      userAgent
    };

    // If user is authenticated, check for suspicious activity
    if (req.user?._id) {
      const isSuspicious = await FingerprintService.isSuspiciousActivity(
        req.user._id,
        fingerprint
      );

      if (isSuspicious) {
        throw new AppError(
          ErrorType.SUSPICIOUS_ACTIVITY,
          'Suspicious activity detected',
          403
        );
      }

      // Track the device
      await FingerprintService.trackDevice(
        req.user._id,
        fingerprint,
        ip,
        userAgent
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}