import { Request, Response } from 'express';
import { assignRole, approveUser, banUser } from '../services/roleService';
import logger from '../utils/logger';

export const assignUserRole = async (req: Request, res: Response) => {
  const { userId, role } = req.body;

  try {
    const user = await assignRole(userId, role);
    if (!user) {
      logger.error(`User not found: ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }
    logger.info(`Role assigned to user: ${userId} - ${role}`);
    res.status(200).json(user);
  } catch (error) {
    logger.error(`Error assigning role to user: ${error}`);
    res.status(500).json({ message: 'Failed to assign role' });
  }
};

export const approveUserRole = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const user = await approveUser(userId);
    if (!user) {
      logger.error(`User not found: ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }
    logger.info(`User approved: ${userId}`);
    res.status(200).json(user);
  } catch (error) {
    logger.error(`Error approving user: ${error}`);
    res.status(500).json({ message: 'Failed to approve user' });
  }
};

export const banUserAccount = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const user = await banUser(userId);
    if (!user) {
      logger.error(`User not found: ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }
    logger.info(`User banned: ${userId}`);
    res.status(200).json(user);
  } catch (error) {
    logger.error(`Error banning user: ${error}`);
    res.status(500).json({ message: 'Failed to ban user' });
  }
};