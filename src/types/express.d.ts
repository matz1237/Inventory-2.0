import { IUser } from '../models/userModel';

declare global {
  namespace Express {
    interface Request {
      deviceInfo?: {
        fingerprint: string;
        ip: string;
        userAgent: string;
      };
      user?: {
        _id: Types.ObjectId;
        phoneNumber: string;
        role: string;
        status: string;
      }
    }
  }
}

export {};