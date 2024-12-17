export enum ErrorType {
    WHATSAPP_CONNECTION_ERROR = 'WHATSAPP_CONNECTION_ERROR',
    OTP_DELIVERY_ERROR = 'OTP_DELIVERY_ERROR',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY'
  }
  
  export class AppError extends Error {
    constructor(
      public type: ErrorType,
      public message: string,
      public statusCode: number = 500
    ) {
      super(message);
    }
  }