import { createClient } from 'redis';
import { REDIS_URL,REDIS_PASSWORD } from '../utils/config';
import logger from '../utils/logger';

export const redisClient = createClient({
  password: REDIS_PASSWORD,
  socket: {
      host: REDIS_URL,
      port: 12886
  }
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log('Redis connected');
    logger.info('Redis connected');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
};
