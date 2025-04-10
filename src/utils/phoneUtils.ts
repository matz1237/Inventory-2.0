import { PhoneNumber, PhoneNumberValidationResult, PhoneNumberRedisKeys } from '../types/phoneNumber';
import { AppError, ErrorType } from './errorTypes';

// Simplified regex for Indian mobile numbers
const PHONE_REGEX = /^(?:\+?91)?([6-9]\d{9})$/;

/**
 * Validates and formats a phone number to ensure it's a valid Indian mobile number
 */
export const validatePhoneNumber = (phoneNumber: string): PhoneNumberValidationResult => {
  try {
    // Remove all whitespace and special characters
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Check if the number matches the required format and extract the main number
    const match = cleaned.match(PHONE_REGEX);

    if (!match) {
      return {
        isValid: false,
        error: 'Invalid phone number format. Must be a valid Indian mobile number.'
      };
    }

    // Extract the 10-digit number (captured group)
    const nationalNumber = match[1];
    
    // Create standardized E.164 format with whatsapp Format
    const standardized = `+91${nationalNumber}`;

    return {
      isValid: true,
      phoneNumber: {
        original: phoneNumber,
        standardized
      }
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Failed to validate phone number'
    };
  }
};

/**
 * Processes a phone number string into a standardized format or throws an error
 */
export const processPhoneNumber = (phoneNumber: string): PhoneNumber => {
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

/**
 * Generates Redis keys for OTP-related operations with a phone number
 */
export const generateRedisKeys = (phoneNumber: PhoneNumber): PhoneNumberRedisKeys => {
  return {
    otp: `otp:${phoneNumber.standardized}`,
    loginRequest: `login_request:${phoneNumber.standardized}`,
    attempts: `otp_attempts:${phoneNumber.standardized}`
   // verified: `otp:verified:${phoneNumber.standardized}`
  };
};

/**
 * Checks if a phone number has exceeded the maximum allowed OTP attempts
 */
export const isInCooldown = async (phoneNumber: PhoneNumber, redisClient: any): Promise<boolean> => {
  const { attempts } = generateRedisKeys(phoneNumber);
  const attemptsCount = await redisClient.get(attempts);
  return attemptsCount && parseInt(attemptsCount) >= 3;
};

/**
 * Generates a WhatsApp JID from a phone number
 */
export const getWhatsAppJID = (phoneNumber: string | PhoneNumber): string => {
  if (typeof phoneNumber === 'string') {
    phoneNumber = processPhoneNumber(phoneNumber);
  }
  // Remove the + sign and append the WhatsApp domain
  return `${phoneNumber.standardized.replace('+', '')}@s.whatsapp.net`;
};