import { Request, Response } from 'express';
import { assignRole, approveUser, banUser } from '../services/roleService';
import logger from '../utils/logger';

export const assignUserRole = async (req: Request, res: Response) => {
  const { userId, role } = req.body;
  const requestId = req.headers['x-request-id'] || 'unknown';
  try {
    const user = await assignRole(userId, role);
    if (!user) {
      logger.error({ message: `User not found`, userId, requestId });
      return res.status(404).json({ message: 'User not found' });
    }
    logger.info({ message: `Role assigned to user`, userId, role, requestId });
    res.status(200).json(user);
  } catch (error) {
    logger.error({ message: `Error assigning role to user`, error, requestId });
    res.status(500).json({ message: 'Failed to assign role' });
  }
};

export const approveUserRole = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const requestId = req.headers['x-request-id'] || 'unknown';
  try {
    const user = await approveUser(userId);
    if (!user) {
      logger.error({ message: `User not found`, userId, requestId });
      return res.status(404).json({ message: 'User not found' });
    }
    logger.info({ message: `User approved`, userId, requestId });
    res.status(200).json(user);
  } catch (error) {
    logger.error({ message: `Error approving user`, error, requestId });
    res.status(500).json({ message: 'Failed to approve user' });
  }
};

export const banUserAccount = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const requestId = req.headers['x-request-id'] || 'unknown';

  try {
    const user = await banUser(userId);
    if (!user) {
      logger.error({ message: `User not found`, userId, requestId });
      return res.status(404).json({ message: 'User not found' });
    }
    logger.info({ message: `User banned`, userId, requestId });
    res.status(200).json(user);
  } catch (error) {
    logger.error({ message: `Error banning user`, error, requestId });
    res.status(500).json({ message: 'Failed to ban user' });
  }
};