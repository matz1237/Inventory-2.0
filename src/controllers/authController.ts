import { Request, Response } from 'express';
import { generateOTP, sendOTPWhatsApp } from '../services/authService';
import { redisClient } from '../config/redis';
import  logger from '../utils/logger';

export const registerUser = async (req: Request, res: Response) => {
  const { phoneNumber } = req.body;

  try {
    const otp = generateOTP();
    await redisClient.setEx(phoneNumber, 300, otp); // 5 minutes expiration

    await sendOTPWhatsApp(phoneNumber, otp);

    logger.info(`OTP sent to ${phoneNumber}: ${otp}`);

    res.status(200).json({ message: 'OTP sent to your WhatsApp' });
  } catch (error) {
    logger.error(`Error sending OTP to ${phoneNumber}: ${error}`);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  const { phoneNumber, otp } = req.body;

  try {
    const storedOTP = await redisClient.get(phoneNumber);

    if (!storedOTP) {
      logger.error(`No OTP found for ${phoneNumber}`);
      return res.status(400).json({ message: 'OTP expired or not found' });
    }

    if (storedOTP !== otp) {
      logger.error(`Incorrect OTP for ${phoneNumber}`);
      return res.status(400).json({ message: 'Incorrect OTP' });
    }

    await redisClient.del(phoneNumber);

    logger.info(`OTP verified for ${phoneNumber}`);

    res.status(200).json({ message: 'Registration successful', token: 'your_jwt_token' });
  } catch (error) {
    logger.error(`Error verifying OTP for ${phoneNumber}: ${error}`);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
};