import { User } from '../models/userModel';
import logger from '../utils/logger';

export const assignRole = async (userId: string, role: string) => {
  const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
  if (!user) {
    logger.error(`User not found: ${userId}`);
    return null;
  }
  logger.info(`Role assigned to user: ${userId} - ${role}`);
  return user;
};

export const approveUser = async (userId: string) => {
  const user = await User.findByIdAndUpdate(userId, { isApproved: true }, { new: true });
  if (!user) {
    logger.error(`User not found: ${userId}`);
    return null;
  }
  logger.info(`User approved: ${userId}`);
  return user;
};

export const banUser = async (userId: string) => {
  const user = await User.findByIdAndUpdate(userId, { isBanned: true }, { new: true });
  if (!user) {
    logger.error(`User not found: ${userId}`);
    return null;
  }
  logger.info(`User banned: ${userId}`);
  return user;
};