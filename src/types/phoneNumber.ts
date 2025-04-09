export interface PhoneNumber {
  original: string;
  standardized: string;
  countryCode: string;
  nationalNumber: string;
  isValid: boolean;
  format: 'E.164' | 'NATIONAL' | 'INTERNATIONAL';
}

export interface PhoneNumberValidationResult {
  isValid: boolean;
  error?: string;
  phoneNumber?: PhoneNumber;
}

export interface PhoneNumberRedisKeys {
  otp: string;
  loginRequest: string;
  attempts: string;
  verified: string;
} 