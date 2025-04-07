import { Request, Response } from 'express';
import { redisClient } from '../config/redis';
import { deleteVerifiedOTP } from '../services/authService';
import logger from '../utils/logger';
import { io } from '../config/socket';
import jwt from 'jsonwebtoken';
import { standardizePhoneNumber, getRedisPhoneKey } from '../utils/phoneUtils';
import { JWT_SECRET } from '../utils/config';
import { User } from '../models/userModel';

export const verifyOTP = async (req: Request, res: Response) => {
  const { phoneNumber, otp } = req.body;

  // Validate phone number format
  const PhoneNumberPattern = /^(?:\+91|91)?[6-9]\d{9}$|^[6-9]\d{9}$/;
  if (!PhoneNumberPattern.test(phoneNumber)) {
    return res.status(400).json({ message: 'Invalid Indian phone number format.' });
  }
  // Standardize phone number
  const standardizedPhone = getRedisPhoneKey(phoneNumber);

  try {
    // Retrieve the stored OTP from Redis with standardized phone
    const storedOTP = await redisClient.get(`otp:${standardizedPhone}`);
    
    if (!storedOTP) {
      logger.error(`No OTP found for ${standardizedPhone}`);
      return res.status(400).json({ message: 'No OTP found or OTP expired' });
    }

    if (storedOTP !== otp) {
      logger.error(`Incorrect OTP for ${standardizedPhone}`);
      return res.status(400).json({ message: 'Incorrect OTP' });
    }

    // Delete the OTP after successful verification
    await deleteVerifiedOTP(phoneNumber);
    
    // Get or create user record
    const user = await User.findOneAndUpdate(
      { phoneNumber: standardizedPhone },
      { 
        $set: { 
          lastLogin: new Date(),
          // If this is first verification, update status to approved
          status: 'approved'
        }
      },
      { new: true, upsert: true }
    );

    // Generate token for the user
    const token = jwt.sign({ phoneNumber: standardizedPhone }, JWT_SECRET, { expiresIn: '12h' });
    
    logger.info(`User ${standardizedPhone} logged in successfully`);
    io.emit('loginSuccess', { phoneNumber: standardizedPhone });
    
    // Assign user to role-specific room
    io.to(user.role).emit('roleUpdate', { phoneNumber: standardizedPhone, role: user.role });

    return res.status(200).json({ 
      message: 'Login successful',
      token,
      user: {
        phoneNumber: user.phoneNumber,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    logger.error(`Error verifying OTP for ${standardizedPhone}: ${error}`);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  let { phoneNumber } = req.body;
  const ip = req.ip;
  const deviceId = req.headers['device-id'];

  logger.info(`Login attempt for phone number: ${phoneNumber} from IP: ${ip}`);

  // Validate phone number
  const PhoneNumberPattern = /^(?:\+91|91)?[6-9]\d{9}$|^[6-9]\d{9}$/;
  if (!PhoneNumberPattern.test(phoneNumber)) {
    return res.status(400).json({ message: 'Invalid Indian phone number format.' });
  }

  // Standardize phone number
  const standardizedPhone = getRedisPhoneKey(phoneNumber);

  try {
    // Check for existing OTP
    const existingOTP = await redisClient.get(`otp:${standardizedPhone}`);
    if (existingOTP) {
      logger.warn(`An OTP has already been sent to ${standardizedPhone}.`);
      return res.status(400).json({ message: 'An OTP has already been sent. Please wait for it to expire.' });
    }

    // Set a login request in Redis
    await redisClient.setEx(`login_request:${standardizedPhone}`, 300, 'requested'); // 5 minutes expiration

    logger.info(`Login request initiated for ${standardizedPhone}`);
    
    // Create or update user record
    const user = await User.findOneAndUpdate(
      { phoneNumber: standardizedPhone },
      { 
        $set: { 
          lastLoginAttempt: new Date(),
          deviceId: deviceId,
          ipAddress: ip,
          status: 'pending' // Set initial status as pending
        }
      },
      { new: true, upsert: true }
    );

    res.status(200).json({ 
      message: 'Please send "Hello, give me access" to receive your OTP.',
      userStatus: user.status
    });
  } catch (error) {
    logger.error(`Error initiating login for ${standardizedPhone}: ${error}`);
    res.status(500).json({ message: 'Failed to initiate login due to server error' });
  }
};