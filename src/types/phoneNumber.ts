export interface PhoneNumber {
  original: string;
  standardized: string;
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
  //verified: string;
} 