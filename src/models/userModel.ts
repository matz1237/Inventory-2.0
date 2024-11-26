import { Schema, model, Document, Types} from 'mongoose';
import { z } from 'zod';

interface IUser extends Document {
  _id: Types.ObjectId;
  phoneNumber: string;
  role: string;
  isApproved: boolean;
  isBanned: boolean;
}

const userSchema = new Schema({
  phoneNumber: { type: String, required: true, unique: true },
  role: {
          type: String,
          enum: ['user', 'supplier', 'shop', 'moderator', 'admin', 'superadmin'], 
          default: 'User',
          required: true
        },
  isApproved: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
});

const UserSchemaValidation = z.object({
  phoneNumber: z.string().regex(/^\d+$/, 'Phone number must be numeric').length(10, 'Phone number must be 10 digits'),
});

export const User = model<IUser>('User', userSchema);
export { UserSchemaValidation,IUser };