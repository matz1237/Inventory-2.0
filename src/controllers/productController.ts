import { Request, Response } from 'express';
import { createProduct, getProductById, updateProductPrice } from '../services/productService';
import logger from '../utils/logger';

export const createNewProduct = async (req: Request, res: Response) => {
  const productData = req.body;

  try {
    const product = await createProduct(productData);
    logger.info(`Product created: ${product.name}`);
    res.status(201).json(product);
  } catch (error) {
    logger.error(`Error creating product: ${error}`);
    res.status(500).json({ message: 'Failed to create product' });
  }
};

export const getProduct = async (req: Request, res: Response) => {
  const { productId } = req.params;

  try {
    const product = await getProductById(productId);
    if (!product) {
      logger.error(`Product not found: ${productId}`);
      return res.status(404).json({ message: 'Product not found' });
    }
    logger.info(`Product retrieved: ${product.name}`);
    res.status(200).json(product);
  } catch (error) {
    logger.error(`Error retrieving product: ${error}`);
    res.status(500).json({ message: 'Failed to retrieve product' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { price } = req.body;

  try {
    const product = await updateProductPrice(productId, price);
    if (!product) {
      logger.error(`Product not found: ${productId}`);
      return res.status(404).json({ message: 'Product not found' });
    }
    logger.info(`Product price updated: ${product.name} - ${price}`);
    res.status(200).json(product);
  } catch (error) {
    logger.error(`Error updating product price: ${error}`);
    res.status(500).json({ message: 'Failed to update product price' });
  }
};