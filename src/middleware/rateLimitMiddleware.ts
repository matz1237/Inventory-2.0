import rateLimit from 'express-rate-limit';

export const otpRateLimiter = rateLimit({
  windowMs: 1* 60 * 1000, // 1 mins
  //windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // limit each IP to 3 requests per windowMs
  message: 'Too many OTP requests from this IP, please try again after 24 hours',
});

export const registerRateLimiter = rateLimit({
  windowMs: 1* 60 * 1000, // 1 mins
  //windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many registration requests from this IP, please try again after 24 hours',
});

export const deviceRateLimiter = rateLimit({
  windowMs: 1* 60 * 1000, // 1 mins
  //windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // limit each device to 3 requests per windowMs
  keyGenerator: (req) => req.headers['device-id'] as string,
  message: 'Too many OTP requests from this device, please try again after 24 hours',
});