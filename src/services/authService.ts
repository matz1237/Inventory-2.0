import { redisClient } from '../config/redis';
import logger from '../utils/logger';
import { sendMessageWithTyping } from '../utils/baileys';
import { AppError, ErrorType } from '../utils/errorTypes';
import { processPhoneNumber, generateRedisKeys, isInCooldown } from '../utils/phoneUtils';

const OTP_COOLDOWN = 300;

export const sendOTPWhatsApp = async (phoneNumber: string, otp: string) => {
  try {
    const processedPhone = processPhoneNumber(phoneNumber);
    const redisKeys = generateRedisKeys(processedPhone);
    
    logger.info(`Sending OTP to ${processedPhone.standardized}`);
    
    // Check rate limit
    if (await isInCooldown(processedPhone, redisClient)) {
      logger.warn(`Rate limit exceeded for ${processedPhone.standardized}`);
      throw new AppError(
        ErrorType.RATE_LIMIT_EXCEEDED,
        'Too many OTP requests. Please try again later',
        429
      );
    }

    // Store OTP first
    logger.info(`Storing OTP in Redis for ${processedPhone.standardized}: ${otp}`);
    await redisClient.setEx(redisKeys.otp, 300, otp);
   // await redisClient.setEx(redisKeys.verified, 300, 'false');
    logger.info(`OTP stored in Redis for ${processedPhone.standardized}`);

    // Send OTP message
    const message = `Your OTP is: ${otp}`;
    await sendMessageWithTyping(processedPhone.standardized, message);
    logger.info(`OTP sent successfully to ${processedPhone.standardized}`);

    // Store attempts
    await redisClient.incr(redisKeys.attempts);
    await redisClient.expire(redisKeys.attempts, OTP_COOLDOWN);

    // Verify OTP was stored correctly
    const storedOTP = await redisClient.get(redisKeys.otp);
    if (storedOTP !== otp) {
      logger.error(`OTP verification failed for ${processedPhone.standardized}`);
      throw new AppError(
        ErrorType.OTP_DELIVERY_ERROR,
        'Failed to store OTP',
        500
      );
    }

    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    logger.error(`Failed to send OTP to ${phoneNumber}:`, error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      ErrorType.OTP_DELIVERY_ERROR,
      'Failed to send OTP via WhatsApp',
      503
    );
  }
};

export const deleteVerifiedOTP = async (phoneNumber: string) => {
  try {
    const processedPhone = processPhoneNumber(phoneNumber);
    const redisKeys = generateRedisKeys(processedPhone);
    
    logger.info(`Deleting OTP data for ${processedPhone.standardized}`);
    
    await redisClient.del(redisKeys.otp);
    //await redisClient.del(redisKeys.verified);
    await redisClient.del(redisKeys.attempts);
    logger.info(`OTP and related keys deleted for ${processedPhone.standardized}`);
  } catch (error) {
    logger.error(`Failed to delete OTP keys for ${phoneNumber}:`, error);
    throw new AppError(
      ErrorType.INTERNAL_SERVER_ERROR,
      'Failed to cleanup OTP data',
      500
    );
  }
};