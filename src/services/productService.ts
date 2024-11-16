import { Product, ProductSchemaValidation } from '../models/productModel';
import logger from '../utils/logger';

export const createProduct = async (productData: any) => {
  await ProductSchemaValidation.parseAsync(productData);
  const product = new Product(productData);
  await product.save();
  logger.info(`Product created: ${product.name}`);
  return product;
};

export const getProductById = async (productId: string) => {
  const product = await Product.findById(productId);
  if (!product) {
    logger.error(`Product not found: ${productId}`);
    return null;
  }
  logger.info(`Product retrieved: ${product.name}`);
  return product;
};

export const updateProductPrice = async (productId: string, price: number) => {
  const product = await Product.findById(productId);
  if (!product) {
    logger.error(`Product not found: ${productId}`);
    return null;
  }

  const newRateHistory = {
    price: price,
    date: new Date(),
  };

  product.rateHistory.unshift(newRateHistory);
  if (product.rateHistory.length > 3) {
    product.rateHistory.pop();
  }

  product.price = price;
  await product.save();
  logger.info(`Product price updated: ${product.name} - ${price}`);
  return product;
};