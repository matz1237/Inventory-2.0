import { redisClient } from '../config/redis';
import logger from '../utils/logger';
import { metrics } from '../utils/monitoring';

interface ActivityLog {
  userId?: string;
  action: string;
  timestamp: Date;
  deviceInfo?: any;
  metadata?: any;
}

export class AnalyticsService {
  private static readonly ACTIVITY_LOG_TTL = 60 * 60 * 24 * 30; // 30 days

  static async logActivity(data: ActivityLog) {
    try {
      const logKey = `activity:${Date.now()}`;
      await redisClient.setEx(
        logKey,
        this.ACTIVITY_LOG_TTL,
        JSON.stringify(data)
      );

      logger.info('Activity logged', data);
    } catch (error) {
      logger.error('Failed to log activity:', error);
    }
  }

  static async logSuspiciousActivity(userId: string, activity: string, metadata: any) {
    const data = {
      userId,
      action: 'SUSPICIOUS_ACTIVITY',
      activity,
      timestamp: new Date(),
      metadata
    };

    await this.logActivity(data);
    
    // Alert if multiple suspicious activities
    const suspiciousCount = await this.getSuspiciousActivityCount(userId);
    if (suspiciousCount > 3) {
      logger.alert('Multiple suspicious activities detected', { userId, count: suspiciousCount });
    }
  }

  static async trackMetrics() {
    // Track active users (last 5 minutes)
    const activeUsers = await redisClient.zCount(
      'user_activity',
      Date.now() - 300000,
      '+inf'
    );
    metrics.activeUsers.set(activeUsers);
  }

  private static async getSuspiciousActivityCount(userId: string): Promise<number> {
    const count = await redisClient.get(`suspicious:${userId}`);
    return count ? parseInt(count) : 0;
  }
}