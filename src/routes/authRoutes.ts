import { Router } from 'express';
import { registerUser, verifyOTP } from '../controllers/authController';
import { otpRateLimiter, registerRateLimiter } from '../middleware/rateLimitMiddleware';
import { validateRequest } from '../middleware/validationMiddleware';
import { body } from 'express-validator';

const router = Router();

router.post(
  '/register',
  registerRateLimiter,
  body('phoneNumber').isMobilePhone('any').withMessage('Invalid phone number'),
  validateRequest,
  registerUser
);

router.post(
  '/verify-otp',
  otpRateLimiter,
  body('phoneNumber').isMobilePhone('any').withMessage('Invalid phone number'),
  body('otp').isNumeric().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  validateRequest,
  verifyOTP
);

export default router;