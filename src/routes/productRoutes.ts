import { Router } from 'express';
import { createNewProduct, getProduct, updateProduct } from '../controllers/productController';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validationMiddleware';
import { body, param } from 'express-validator';
import { ProductSchemaValidation } from '../models/productModel';

const router = Router();

router.post(
  '/',
  authenticateJWT,
  authorizeRoles('SuperAdmin', 'Admin'),
  body('name').custom((value) => ProductSchemaValidation.parseAsync({ name: value })),
  body('photo').custom((value) => ProductSchemaValidation.parseAsync({ photo: value })),
  body('description').custom((value) => ProductSchemaValidation.parseAsync({ description: value })),
  body('price').custom((value) => ProductSchemaValidation.parseAsync({ price: value })),
  body('unitPricing').custom((value) => ProductSchemaValidation.parseAsync({ unitPricing: value })),
  validateRequest,
  createNewProduct
);

router.get(
  '/:productId',
  authenticateJWT,
  param('productId').isMongoId().withMessage('Invalid product ID'),
  validateRequest,
  getProduct
);

router.put(
  '/:productId',
  authenticateJWT,
  authorizeRoles('SuperAdmin', 'Admin'),
  param('productId').isMongoId().withMessage('Invalid product ID'),
  body('price').isNumeric().custom((value) => value > 0).withMessage('Price must be a positive number'),
  validateRequest,
  updateProduct
);

export default router;