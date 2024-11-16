import { Schema, model } from 'mongoose';

const otpSchema = new Schema({
  phoneNumber: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

export const OTP = model('OTP', otpSchema);