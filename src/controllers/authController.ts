import { Request, Response } from 'express';
import { generateOTP, sendOTPWhatsApp } from '../services/authService';
import { redisClient } from '../config/redis';
import  logger from '../utils/logger';
import  { io } from '../config/socket';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../utils/config';
import { User } from '../models/userModel';

export const registerUser = async (req: Request, res: Response) => {
  const { phoneNumber } = req.body;
  const ip = req.ip;
  const deviceId = req.headers['device-id'];

  try {
    const existingOTP = await redisClient.get(phoneNumber);
    if (existingOTP) {
      return res.status(400).json({ message: 'An OTP has already been sent. Please wait for it to expire.' });
    }
    const otp = generateOTP();
    logger.info(`OTP sent to ${phoneNumber}: ${otp} from IP: ${ip}, Device ID: ${deviceId}`);
    await redisClient.setEx(phoneNumber, 300, otp); // 5 minutes expiration

    await sendOTPWhatsApp(phoneNumber, otp);
    logger.info(`OTP sent to ${phoneNumber}: ${otp}`);
    io.emit('otpSent', { phoneNumber });

    // Notify user if OTP expires
    setTimeout(async () => {
      const expiredOTP = await redisClient.get(phoneNumber);
      if (expiredOTP) {
        io.emit('otpExpired', { phoneNumber });
      }
    }, 300000);

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
    io.emit('otpVerified', { phoneNumber });

    // Set account to "pending approval"
    let user = new User({ phoneNumber, isApproved: false });
    await user.save();

    const token = jwt.sign({ phoneNumber }, JWT_SECRET, { expiresIn: '12h' });
    res.status(200).json({ message: 'Registration successful',token});

    // Notify user of successful login
    io.emit('loginSuccess', { phoneNumber });
    
    // Assign user to role-specific room
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      io.to(existingUser.role).emit('roleUpdate', { phoneNumber, role: existingUser.role });
    }    
  } catch (error) {
    logger.error(`Error verifying OTP for ${phoneNumber}: ${error}`);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
};