import { User } from '../models/userModel';
import logger from '../utils/logger';
import { z } from 'zod';

// Define validation schemas
const userIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid user ID');
const roleSchema = z.string().min(1, 'Role must be a non-empty string');


export const assignRole = async (userId: string, role: string) => {
  userIdSchema.parse(userId);
  roleSchema.parse(role);
  const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
  if (!user) {
    logger.error(`User not found: ${userId}`);
    return null;
  }
  logger.info(`Role assigned to user: ${userId} - ${role}`);
  return user;
};

export const approveUser = async (userId: string) => {
  userIdSchema.parse(userId);

  const user = await User.findByIdAndUpdate(userId, { status: 'approved' }, { new: true });
  if (!user) {
    logger.error(`User not found: ${userId}`);
    return null;
  }
  logger.info(`User approved: ${userId}`);
  return user;
};

export const banUser = async (userId: string) => {
  userIdSchema.parse(userId);
  
  const user = await User.findByIdAndUpdate(userId, { status: 'banned' }, { new: true });
  if (!user) {
    logger.error(`User not found: ${userId}`);
    return null;
  }
  logger.info(`User banned: ${userId}`);
  return user;
};