import { Router } from 'express';
import { registerUser, verifyOTP, loginUser } from '../controllers/authController';
import { otpRateLimiter, registerRateLimiter, deviceRateLimiter } from '../middleware/rateLimitMiddleware';
import { validateRequest } from '../middleware/validationMiddleware';
import { body } from 'express-validator';
import logger from '../utils/logger';
import { logRequest } from '../middleware/loggingMiddleware';
import { redisClient } from 'config/redis';

const router = Router();

router.post(
  '/register',
  logRequest,
  registerRateLimiter,
  deviceRateLimiter,
  body('phoneNumber')
    .matches(/^(?:\+91|91)?[6-9]\d{9}$|^[6-9]\d{9}$/)
    .withMessage('Please enter a valid phone number with country code'),
  validateRequest,
  registerUser
);

router.post(
  '/verify-otp',
  otpRateLimiter,
  deviceRateLimiter,
  body('phoneNumber')
    .matches(/^(?:\+91|91)?[6-9]\d{9}$|^[6-9]\d{9}$/)
    .withMessage('Invalid phone number'),
  body('otp').isNumeric().isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits'),
  validateRequest,
  verifyOTP
);

router.post(
  '/login',
  logRequest,
  registerRateLimiter,
  deviceRateLimiter,
  body('phoneNumber')
    .matches(/^(?:\+91|91)?[6-9]\d{9}$|^[6-9]\d{9}$/)
    .withMessage('Please enter a valid phone number with country code'),
  validateRequest,
  loginUser
);

export default router;