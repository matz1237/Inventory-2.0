import { redisClient } from '../config/redis';
import logger from '../utils/logger';
import { sendMessage } from '../utils/baileys';    
import { AppError, ErrorType } from '../utils/errorTypes';

const OTP_COOLDOWN = 300;

// Ensure sendMessage is correctly imported and used
export const generateOTP = () => {
  // Example OTP generation logic
  return Math.floor(100000 + Math.random() * 900000).toString(); // Generates a 6-digit OTP
};

export const sendOTPWhatsApp = async (phoneNumber: string, otp: string) => {
  try {
    // Check rate limit
    const attempts = await redisClient.get(`otp_attempts:${phoneNumber}`);
    if (attempts && parseInt(attempts) >= 3) {
      throw new AppError(
        ErrorType.RATE_LIMIT_EXCEEDED,
        'Too many OTP requests. Please try again later',
        429
      );
    }

    // Send OTP message
    const message = `Your OTP is: ${otp}`;
    await sendMessage(phoneNumber, message);
    logger.info(`OTP sent to ${phoneNumber}`);

    // Increment the OTP attempts count
    await redisClient.incr(`otp_attempts:${phoneNumber}`);
    await redisClient.expire(`otp_attempts:${phoneNumber}`, OTP_COOLDOWN);

    // Store OTP and set verification status
    await redisClient.setEx(`otp:${phoneNumber}`, 300, otp);
    await redisClient.setEx(`otp:verified:${phoneNumber}`, 300, 'false');

    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    logger.error(`Failed to send OTP to ${phoneNumber}: ${error}`);
    throw new AppError(
      ErrorType.OTP_DELIVERY_ERROR,
      'Failed to send OTP via WhatsApp',
      503
    );
  }
};