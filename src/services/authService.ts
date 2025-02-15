import { redisClient } from '../config/redis';
import logger from '../utils/logger';
import { sendMessageWithTyping } from '../utils/baileys';
import { AppError, ErrorType } from '../utils/errorTypes';
import { getRedisPhoneKey } from '../utils/phoneUtils';

const OTP_COOLDOWN = 300;

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendOTPWhatsApp = async (phoneNumber: string, otp: string) => {
  try {
    const standardizedPhone = getRedisPhoneKey(phoneNumber);
    
    // Check rate limit with standardized phone
    const attempts = await redisClient.get(`otp_attempts:${standardizedPhone}`);
    if (attempts && parseInt(attempts) >= 3) {
      throw new AppError(
        ErrorType.RATE_LIMIT_EXCEEDED,
        'Too many OTP requests. Please try again later',
        429
      );
    }

    // Send OTP message using original phone number for WhatsApp
    const message = `Your OTP is: ${otp}`;
    await sendMessageWithTyping(phoneNumber, message);
    logger.info(`OTP sent to ${standardizedPhone}`);

    // Store attempts with standardized phone
    await redisClient.incr(`otp_attempts:${standardizedPhone}`);
    await redisClient.expire(`otp_attempts:${standardizedPhone}`, OTP_COOLDOWN);

    // Store OTP with standardized phone
    await redisClient.setEx(`otp:${standardizedPhone}`, 300, otp);
    await redisClient.setEx(`otp:verified:${standardizedPhone}`, 300, 'false');

    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    logger.error(`Failed to send OTP: ${error}`);
    throw new AppError(
      ErrorType.OTP_DELIVERY_ERROR,
      'Failed to send OTP via WhatsApp',
      503
    );
  }
};

export const deleteVerifiedOTP = async (phoneNumber: string) => {
  try {
    const standardizedPhone = getRedisPhoneKey(phoneNumber);
    await redisClient.del(`otp:${standardizedPhone}`);
    await redisClient.del(`otp:verified:${standardizedPhone}`);
    await redisClient.del(`otp_attempts:${standardizedPhone}`);
    logger.info(`OTP and related keys deleted for ${standardizedPhone}`);
  } catch (error) {
    logger.error(`Failed to delete OTP keys: ${error}`);
    throw new AppError(
      ErrorType.INTERNAL_SERVER_ERROR,
      'Failed to cleanup OTP data',
      500
    );
  }
};