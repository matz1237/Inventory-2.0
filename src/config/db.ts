import mongoose from 'mongoose';
import { MONGODB_URI } from '../utils/config';
import logger from '../utils/logger';

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {});
    console.log('MongoDB connected');
    logger.info('MongoDB connected');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw new Error('Failed to connect to MongoDB');
  }
};