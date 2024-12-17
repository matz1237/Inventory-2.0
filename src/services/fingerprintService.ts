import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { redisClient } from '../config/redis';
import logger from '../utils/logger';

interface DeviceInfo {
  fingerprint: string;
  userAgent: string;
  ip: string;
  lastSeen: Date;
  loginAttempts: number;
}

export class FingerprintService {
  private static SUSPICIOUS_LOGIN_THRESHOLD = 3;
  private static TRACKING_EXPIRY = 60 * 60 * 24 * 7; // 7 days

  static async generateFingerprint(req: any): Promise<string> {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    
    return result.visitorId;
  }

  static async trackDevice(userId: string, fingerprint: string, ip: string, userAgent: string) {
    const key = `device:${userId}:${fingerprint}`;
    
    const deviceInfo: DeviceInfo = {
      fingerprint,
      userAgent,
      ip,
      lastSeen: new Date(),
      loginAttempts: 1
    };

    // Store device info in Redis
    await redisClient.setEx(
      key,
      this.TRACKING_EXPIRY,
      JSON.stringify(deviceInfo)
    );

    return deviceInfo;
  }

  static async isSuspiciousActivity(userId: string, fingerprint: string): Promise<boolean> {
    try {
      // Check for multiple devices
      const userDevices = await redisClient.keys(`device:${userId}:*`);
      if (userDevices.length > 5) {
        logger.warn(`Multiple devices detected for user ${userId}`);
        return true;
      }

      // Check login attempts
      const deviceKey = `device:${userId}:${fingerprint}`;
      const deviceInfo = await redisClient.get(deviceKey);
      
      if (deviceInfo) {
        const info: DeviceInfo = JSON.parse(deviceInfo);
        if (info.loginAttempts >= this.SUSPICIOUS_LOGIN_THRESHOLD) {
          logger.warn(`Suspicious login attempts detected for user ${userId}`);
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Error checking suspicious activity:', error);
      return false;
    }
  }
}