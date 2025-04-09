import { Request, Response } from 'express';
import { redisClient } from '../config/redis';
import { deleteVerifiedOTP } from '../services/authService';
import logger from '../utils/logger';
import { io } from '../config/socket';
import jwt from 'jsonwebtoken';
import { processPhoneNumber, generateRedisKeys } from '../utils/phoneUtils';
import { JWT_SECRET } from '../utils/config';
import { User } from '../models/userModel';

export const verifyOTP = async (req: Request, res: Response) => {
  const { phoneNumber, otp } = req.body;

  try {
    const processedPhone = processPhoneNumber(phoneNumber);
    const { otp: otpKey } = generateRedisKeys(processedPhone);

    // Retrieve the stored OTP from Redis
    const storedOTP = await redisClient.get(otpKey);
    
    if (!storedOTP) {
      logger.error(`No OTP found for ${processedPhone.standardized}`);
      return res.status(400).json({ message: 'No OTP found or OTP expired' });
    }

    if (storedOTP !== otp) {
      logger.error(`Incorrect OTP for ${processedPhone.standardized}`);
      return res.status(400).json({ message: 'Incorrect OTP' });
    }

    // Delete the OTP after successful verification
    await deleteVerifiedOTP(phoneNumber);
    
    // Get or create user record
    const user = await User.findOneAndUpdate(
      { phoneNumber: processedPhone.standardized },
      { 
        $set: { 
          lastLogin: new Date()
        }
      },
      { new: true, upsert: true }
    );

    // Generate token with user status included
    const token = jwt.sign(
      { 
        phoneNumber: processedPhone.standardized,
        status: user.status,
        role: user.role
      }, 
      JWT_SECRET, 
      { expiresIn: '12h' }
    );
    
    logger.info(`User ${processedPhone.standardized} logged in successfully with status: ${user.status}`);
    io.emit('loginSuccess', { phoneNumber: processedPhone.standardized });
    
    // Assign user to role-specific room
    io.to(user.role).emit('roleUpdate', { phoneNumber: processedPhone.standardized, role: user.role });

    return res.status(200).json({ 
      message: user.status === 'pending' 
        ? 'OTP verified. You can view products but prices are hidden until admin approval.'
        : 'Login successful',
      token,
      user: {
        phoneNumber: user.phoneNumber,
        role: user.role,
        status: user.status,
        permissions: {
          canViewProducts: true,
          canViewPrices: user.status === 'approved'
        }
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid phone number length')) {
      logger.warn(`Invalid phone number length: ${phoneNumber}`);
      return res.status(400).json({ message: 'Invalid phone number. Must be 10 digits.' });
    }
    logger.error(`Error verifying OTP for ${phoneNumber}: ${error}`);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  let { phoneNumber } = req.body;
  const ip = req.ip;
  const deviceId = req.headers['device-id'];

  logger.info(`Login attempt for phone number: ${phoneNumber} from IP: ${ip}`);

  try {
    const processedPhone = processPhoneNumber(phoneNumber);
    const { loginRequest: loginRequestKey, otp: otpKey } = generateRedisKeys(processedPhone);

    // Check for existing OTP
    const existingOTP = await redisClient.get(otpKey);
    if (existingOTP) {
      logger.warn(`An OTP has already been sent to ${processedPhone.standardized}.`);
      return res.status(400).json({ message: 'An OTP has already been sent. Please wait for it to expire.' });
    }

    // Set a login request in Redis
    await redisClient.setEx(loginRequestKey, 300, 'requested'); // 5 minutes expiration

    // Create or update user record with pending status
    const user = await User.findOneAndUpdate(
      { phoneNumber: processedPhone.standardized },
      { 
        $set: { 
          lastLoginAttempt: new Date(),
          deviceId: deviceId,
          ipAddress: ip,
          status: 'pending',
          role: 'user' // Default role for new users
        }
      },
      { new: true, upsert: true }
    );

    logger.info(`Login request initiated for ${processedPhone.standardized} with status: ${user.status}`);
    
    res.status(200).json({ 
      message: 'Please send "Hello, give me access" to receive your OTP.',
      userStatus: user.status
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid phone number length')) {
      logger.warn(`Invalid phone number length: ${phoneNumber}`);
      return res.status(400).json({ message: 'Invalid phone number. Must be 10 digits.' });
    }
    logger.error(`Error initiating login for ${phoneNumber}: ${error}`);
    res.status(500).json({ message: 'Failed to initiate login due to server error' });
  }
};