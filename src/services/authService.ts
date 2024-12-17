import { redisClient } from '../config/redis';
import crypto from 'crypto';
import logger from '../utils/logger';
import { sendMessage } from '../utils/baileys';
import { AppError, ErrorType } from '../utils/errorTypes';
import { AnalyticsService } from './analyticsService';
import { metrics } from '../utils/monitoring';
const OTP_COOLDOWN = 300;

// Ensure sendMessage is correctly imported and used
export const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString()
};

export const sendOTPWhatsApp = async (phoneNumber: string, otp: string) => {
  try{
    metrics.otpRequests.labels('attempt').inc();
    // Check rate limit
    const attempts = await redisClient.get(`otp_attempts:${phoneNumber}`);
    if (attempts && parseInt(attempts) >= 3) {
      throw new AppError(
        ErrorType.RATE_LIMIT_EXCEEDED,
        'Too many OTP requests. Please try again later',
        429
      );
    }
  // Send OTP
  await sendMessage(phoneNumber, `Your OTP is: ${otp}`);
  await redisClient.incr(`otp_attempts:${phoneNumber}`);
  await redisClient.expire(`otp_attempts:${phoneNumber}`, 24 * 60 * 60); // 24 hours
  await AnalyticsService.logActivity({
    action: 'OTP_SENT',
    timestamp: new Date(),
    metadata: { phoneNumber }
  });
  metrics.otpRequests.labels('success').inc();
  logger.info(`OTP sent to ${phoneNumber}: ${otp}`);
  }catch(error){ 
    metrics.otpRequests.labels('failure').inc();
    throw new AppError(
        ErrorType.OTP_DELIVERY_ERROR,
        'Failed to send OTP via WhatsApp',
        503
    );
  }
};