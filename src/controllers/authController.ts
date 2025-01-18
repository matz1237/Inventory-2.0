import { Request, Response } from 'express';
import { redisClient } from '../config/redis';
import logger from '../utils/logger';
import { io } from '../config/socket';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../utils/config';
import { User } from '../models/userModel';

export const registerUser = async (req: Request, res: Response) => {
  let { phoneNumber } = req.body;
  const ip = req.ip;
  const deviceId = req.headers['device-id'];

  // Log the phone number being registered
  logger.info(`Registering phone number: ${phoneNumber} from IP: ${ip}`);

  // Validate phone number format
  const PhoneNumberPattern = /^(?:\+91|91)?[6-9]\d{9}$|^[6-9]\d{9}$/;
  if (!PhoneNumberPattern.test(phoneNumber)) {
    return res.status(400).json({ message: 'Invalid Indian phone number format.' });
  }

  // Ensure phone number includes country code
  if (!phoneNumber.startsWith('+91')) {
    phoneNumber = `+91${phoneNumber}`;
  }

  // Respond to the user indicating that they need to send the access request message
  res.status(200).json({ message: 'Please send "Hello, give me access" to receive your OTP.' });
  
};

export const verifyOTP = async (req: Request, res: Response) => {
  const { phoneNumber, otp } = req.body;

  try {
    // Retrieve the stored OTP from Redis
    const storedOTP = await redisClient.get(phoneNumber);

    if (!storedOTP) {
      logger.error(`No OTP found for ${phoneNumber}`);
      return res.status(400).json({ message: 'OTP expired or not found' });
    }

    if (storedOTP !== otp) {
      logger.error(`Incorrect OTP for ${phoneNumber}`);
      return res.status(400).json({ message: 'Incorrect OTP' });
    }

    // Delete the OTP from Redis after successful verification
    await redisClient.del(phoneNumber);
    logger.info(`OTP verified for ${phoneNumber}`);
    io.emit('otpVerified', { phoneNumber });

    // Set account to "pending approval"
    const user = await User.findOneAndUpdate(
      { phoneNumber },
      { status: 'pending' },
      { new: true, upsert: true }
    );

    const token = jwt.sign({ phoneNumber }, JWT_SECRET, { expiresIn: '12h' });
    res.status(200).json({ message: 'Registration successful', token });

    // Notify user of successful login
    io.emit('loginSuccess', { phoneNumber });
    
    // Assign user to role-specific room
    if (user) {
      io.to(user.role).emit('roleUpdate', { phoneNumber, role: user.role });
    }   

    logger.info(`Stored OTP for ${phoneNumber}: ${storedOTP}`);
    logger.info(`User provided OTP: ${otp}`);
  } catch (error) {
    logger.error(`Error verifying OTP for ${phoneNumber}: ${error}`);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  let { phoneNumber } = req.body;
  const ip = req.ip;

  logger.info(`Login attempt for phone number: ${phoneNumber} from IP: ${ip}`);

  const PhoneNumberPattern = /^(?:\+91|91)?[6-9]\d{9}$|^[6-9]\d{9}$/;
  if (!PhoneNumberPattern.test(phoneNumber)) {
    return res.status(400).json({ message: 'Invalid Indian phone number format.' });
  }

  if (!phoneNumber.startsWith('+91')) {
    phoneNumber = `+91${phoneNumber}`;
  }

  try {
    // Set a login request in Redis
    await redisClient.setEx(`login_request:${phoneNumber}`, 300, 'requested'); // 5 minutes expiration

    res.status(200).json({ message: 'Login request initiated. Please send "Hello, give me access" to receive your OTP.' });
  } catch (error) {
    logger.error(`Error initiating login for ${phoneNumber}: ${error}`);
    res.status(500).json({ message: 'Failed to initiate login due to server error' });
  }
};