import { Schema, model } from 'mongoose';
import { z } from 'zod';

const userSchema = new Schema({
  phoneNumber: { type: String, required: true, unique: true },
  role: { type: String, default: 'User' },
  isApproved: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
});

const UserSchemaValidation = z.object({
  phoneNumber: z.string().regex(/^\d+$/, 'Phone number must be numeric').length(10, 'Phone number must be 10 digits'),
});

export const User = model('User', userSchema);
export { UserSchemaValidation };