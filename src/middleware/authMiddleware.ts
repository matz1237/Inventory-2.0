import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../utils/config';
import { IUser, User } from '../models/userModel';

interface JWTPayload {
  phoneNumber: string;
}

const roleHierarchy = {
  SuperAdmin: 1,
  Admin: 2,
  Moderator: 3,
  User: 4,
};

type Role = keyof typeof roleHierarchy;

export const authenticateJWT = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    const user = await User.findOne({ phoneNumber: decoded.phoneNumber });
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token' });
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user || !roles.includes((req as any).user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
};

export const checkRoleHierarchy = (req: Request, res: Response, next: NextFunction) => {
  const role = req.body.role as Role;
  const userRole = (req as any).user?.role as Role;

  if (userRole && roleHierarchy[role] >= roleHierarchy[userRole]) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
}