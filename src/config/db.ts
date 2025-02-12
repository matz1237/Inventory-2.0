import mongoose from 'mongoose';
import { MONGODB_URI } from '../utils/config';
import logger from '../utils/logger';

mongoose.set('strictQuery', true); // or false, depending on your preference

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {});
    logger.info('MongoDB connected');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw new Error('Failed to connect to MongoDB');
  }
};