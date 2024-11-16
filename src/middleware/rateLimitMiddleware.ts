import rateLimit from 'express-rate-limit';

export const otpRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // limit each IP to 3 requests per windowMs
  message: 'Too many OTP requests from this IP, please try again after 24 hours',
});

export const registerRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many registration requests from this IP, please try again after 24 hours',
});