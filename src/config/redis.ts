import { createClient } from 'redis';
import { REDIS_URL,REDIS_PASSWORD, REDIS_PORT } from '../utils/config';
import logger from '../utils/logger';

export const redisClient = createClient({
  username:'default',
  password: REDIS_PASSWORD,
  socket: {
    host: REDIS_URL,
    port: Number(REDIS_PORT),
}
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    logger.info('Redis connected');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
};

