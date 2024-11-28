import { createClient } from 'redis';
import { REDIS_URL } from '../utils/config';
import logger from '../utils/logger';


export const redisClient = createClient({ url: REDIS_URL });

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    logger.info('Redis connected');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
};
