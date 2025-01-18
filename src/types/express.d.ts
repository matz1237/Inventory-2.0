import { IUser } from '../models/userModel';

declare global {
  namespace Express {
    interface Request {
      deviceInfo?: {
        deviceId: string;
        deviceType: string;
        fingerprint: string;
        ip: string;
        userAgent: string;
      };
      user?: {
        _id: Types.ObjectId;
        phoneNumber: string;
        role: string;
        status: string;
      };
    }
  }
}

export {};