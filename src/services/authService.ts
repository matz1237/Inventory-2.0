import { v4 as uuidv4 } from 'uuid';
import { redisClient } from '../config/redis';
import logger from '../utils/logger';
import { sendMessage } from '../utils/baileys';

// Ensure sendMessage is correctly imported and used
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendOTPWhatsApp = async (phoneNumber: string, otp: string) => {
  const message = `Your OTP is ${otp}. Valid for 5 minutes.`;
  await sendMessage(phoneNumber, message);
  logger.info(`OTP sent to ${phoneNumber}: ${otp}`);
};