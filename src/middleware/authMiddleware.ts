import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../utils/config';
import { IUser } from '../models/userModel';

export interface CustomRequest extends Request {
  user?: IUser;
}
const roleHierarchy = {
  SuperAdmin: 1,
  Admin: 2,
  Moderator: 3,
  User: 4,
};
  
export const authenticateJWT = (req: CustomRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as IUser;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token' });
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: CustomRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
};

export const checkRoleHierarchy = (req: CustomRequest, res: Response, next: NextFunction) => {
  const { role } = req.body;
  const userRole = req.user?.role;

  if (userRole && roleHierarchy[role] >= roleHierarchy[userRole]) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
}