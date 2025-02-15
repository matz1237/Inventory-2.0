import { Request, Response } from 'express';
import { redisClient } from '../config/redis';
import { deleteVerifiedOTP } from '../services/authService';
import logger from '../utils/logger';
import { io } from '../config/socket';
import jwt from 'jsonwebtoken';
import { standardizePhoneNumber, getRedisPhoneKey } from '../utils/phoneUtils';
import { JWT_SECRET } from '../utils/config';
import { User } from '../models/userModel';

export const registerUser = async (req: Request, res: Response) => {
  let { phoneNumber } = req.body;
  const ip = req.ip;
  const deviceId = req.headers['device-id'];

  // Log the phone number being registered
  //logger.info(`Registering phone number: ${phoneNumber} from IP: ${ip}`);

  // Validate phone number format
  const PhoneNumberPattern = /^(?:\+91|91)?[6-9]\d{9}$|^[6-9]\d{9}$/;
  if (!PhoneNumberPattern.test(phoneNumber)) {
    return res.status(400).json({ message: 'Invalid Indian phone number format.' });
  }
  // Standardize phone number
  const standardizedPhone = getRedisPhoneKey(phoneNumber);

  try {
    // Set a login request in Redis
    await redisClient.setEx(`login_request:${standardizedPhone}`, 300, 'requested'); // 5 minutes expiration

    logger.info(`Login request set for ${standardizedPhone}`);
    
    // Check for existing OTP with correct key
    const existingOTP = await redisClient.get(`otp:${standardizedPhone}`);
    if (existingOTP) {
      logger.warn(`An OTP has already been sent to ${standardizedPhone}.`);
      return res.status(400).json({ message: 'An OTP has already been sent. Please wait for it to expire.' });
    }

    // Respond to the user indicating that they need to send the access request message
    res.status(200).json({ message: 'Please send "Hello, give me access" to receive your OTP.' });
  } catch (error) {
    logger.error(`Error processing request for ${standardizedPhone}: ${error}`);
    res.status(500).json({ message: 'Failed to process request due to server error' });
  }
};

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
    
    // Move logging after verification but before response

    logger.info(`OTP verification successful for ${standardizedPhone}`);
    logger.info(`User provided OTP: ${otp}`);
    
    io.emit('otpVerified', { phoneNumber: standardizedPhone });

    // Set account to "pending approval"
    const user = await User.findOneAndUpdate(
      { phoneNumber: standardizedPhone },
      { status: 'pending' },
      { new: true, upsert: true }
    );

    const token = jwt.sign({ phoneNumber: standardizedPhone }, JWT_SECRET, { expiresIn: '12h' });
    res.status(200).json({ message: 'Registration successful', token });

    // Notify user of successful login
    io.emit('loginSuccess', { phoneNumber: standardizedPhone });
    
    // Assign user to role-specific room
    if (user) {
      io.to(user.role).emit('roleUpdate', { phoneNumber: standardizedPhone, role: user.role });
    }
  } catch (error) {
    logger.error(`Error verifying OTP for ${standardizedPhone}: ${error}`);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  let { phoneNumber } = req.body;
  const ip = req.ip;

  logger.info(`Login attempt for phone number: ${phoneNumber} from IP: ${ip}`);

  // Validate phone number
  const PhoneNumberPattern = /^(?:\+91|91)?[6-9]\d{9}$|^[6-9]\d{9}$/;
  if (!PhoneNumberPattern.test(phoneNumber)) {
    return res.status(400).json({ message: 'Invalid Indian phone number format.' });
  }

  // Standardize phone number
  const standardizedPhone = getRedisPhoneKey(phoneNumber);

  try {
    // Set a login request in Redis
    await redisClient.setEx(`login_request:${standardizedPhone}`, 300, 'requested'); // 5 minutes expiration

    res.status(200).json({ message: 'Login request initiated. Please send "Hello, give me access" to receive your OTP.' });
  } catch (error) {
    logger.error(`Error initiating login for ${standardizedPhone}: ${error}`);
    res.status(500).json({ message: 'Failed to initiate login due to server error' });
  }
};