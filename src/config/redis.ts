import Redis from 'redis';
import { REDIS_URL } from '../utils/config';

export const redisClient = Redis.createClient({
  url: REDIS_URL,
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

export const connectRedis = async () => {
  await redisClient.connect();
  console.log('Redis connected');
};