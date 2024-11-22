import { Router } from 'express';
import { assignUserRole, approveUserRole, banUserAccount } from '../controllers/roleController';
import { authenticateJWT, authorizeRoles, checkRoleHierarchy } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validationMiddleware';
import { body, param } from 'express-validator';

const router = Router();

router.post(
  '/assign-role',
  authenticateJWT,
  authorizeRoles('SuperAdmin', 'Admin'),
  body('userId').isMongoId().withMessage('Invalid user ID'),
  body('role').isString().withMessage('Role must be a string'),
  checkRoleHierarchy,
  validateRequest,
  assignUserRole
);

router.patch(
  '/approve/:userId',
  authenticateJWT,
  authorizeRoles('SuperAdmin', 'Admin','Moderator'),
  param('userId').isMongoId().withMessage('Invalid user ID'),
  validateRequest,
  approveUserRole
);

router.patch(
  '/ban/:userId',
  authenticateJWT,
  authorizeRoles('SuperAdmin'),
  param('userId').isMongoId().withMessage('Invalid user ID'),
  validateRequest,
  banUserAccount
);

export default router;