import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 3000;
export const MONGODB_URI = process.env.MONGODB_URI || '';
export const REDIS_URL = process.env.REDIS_URL || '';
export const WHATSAPP_SESSION_FILE = process.env.WHATSAPP_SESSION_FILE || '';
export const SESSION_SECRET = process.env.SESSION_SECRET || '';
export const JWT_SECRET = process.env.JWT_SECRET || '';