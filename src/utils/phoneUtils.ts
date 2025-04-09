import { PhoneNumber, PhoneNumberValidationResult, PhoneNumberRedisKeys } from '../types/phoneNumber';
import { AppError, ErrorType } from './errorTypes';

const PHONE_REGEX = /^(?:\+91|91)?[6-9]\d{9}$|^[6-9]\d{9}$/;

export const validatePhoneNumber = (phoneNumber: string): PhoneNumberValidationResult => {
  try {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check if the number matches the required format
    if (!PHONE_REGEX.test(cleaned)) {
      return {
        isValid: false,
        error: 'Invalid phone number format. Must be a valid Indian mobile number.'
      };
    }

    // Extract country code and national number
    let countryCode = '91';
    let nationalNumber = cleaned;
    
    if (cleaned.length === 12) {
      countryCode = cleaned.substring(0, 2);
      nationalNumber = cleaned.substring(2);
    } else if (cleaned.length === 11) {
      countryCode = cleaned.substring(0, 1);
      nationalNumber = cleaned.substring(1);
    }

    const standardized = `+${countryCode}${nationalNumber}`;

    return {
      isValid: true,
      phoneNumber: {
        original: phoneNumber,
        standardized,
        countryCode,
        nationalNumber,
        isValid: true,
        format: 'E.164'
      }
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Failed to validate phone number'
    };
  }
};

export const processPhoneNumber = (phoneNumber: string, prefix: string = ''): PhoneNumber => {
  const validation = validatePhoneNumber(phoneNumber);
  
  if (!validation.isValid || !validation.phoneNumber) {
    throw new AppError(
      ErrorType.INVALID_PHONE_NUMBER,
      validation.error || 'Invalid phone number',
      400
    );
  }

  return validation.phoneNumber;
};

export const generateRedisKeys = (phoneNumber: PhoneNumber): PhoneNumberRedisKeys => {
  return {
    otp: `otp:${phoneNumber.standardized}`,
    loginRequest: `login_request:${phoneNumber.standardized}`,
    attempts: `otp_attempts:${phoneNumber.standardized}`,
    verified: `otp:verified:${phoneNumber.standardized}`
  };
};

export const formatPhoneNumber = (phoneNumber: PhoneNumber, format: 'E.164' | 'NATIONAL' | 'INTERNATIONAL' = 'E.164'): string => {
  switch (format) {
    case 'E.164':
      return phoneNumber.standardized;
    case 'NATIONAL':
      return phoneNumber.nationalNumber;
    case 'INTERNATIONAL':
      return `+${phoneNumber.countryCode} ${phoneNumber.nationalNumber}`;
    default:
      return phoneNumber.standardized;
  }
};

// Helper function to check if a phone number is in cooldown period
export const isInCooldown = async (phoneNumber: PhoneNumber, redisClient: any): Promise<boolean> => {
  const { attempts } = generateRedisKeys(phoneNumber);
  const attemptsCount = await redisClient.get(attempts);
  return attemptsCount && parseInt(attemptsCount) >= 3;
};