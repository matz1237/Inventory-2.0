import { Schema, model, Document, Types } from 'mongoose';
import { z } from 'zod';

interface IUser extends Document {
  _id: Types.ObjectId;
  phoneNumber: string;
  role: string;
  status: string;
}

const userSchema = new Schema({
  phoneNumber: { type: String, required: true, unique: true },
  role: {
          type: String,
          enum: ['user', 'supplier', 'shop', 'moderator', 'admin', 'superadmin'], 
          default: 'User',
          required: true
        },
      status: {
        type: String,
        enum: ['pending', 'approved', 'banned'],
        default: 'pending', 
      },
});

const UserSchemaValidation = z.object({
  phoneNumber: z.string().regex(/^\d+$/, 'Phone number must be numeric').length(10, 'Phone number must be 10 digits'),
});

export const User = model<IUser>('User', userSchema);
export { UserSchemaValidation, IUser };