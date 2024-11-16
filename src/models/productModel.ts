import { Schema, model } from 'mongoose';
import { z } from 'zod';

const rateHistorySchema = new Schema({
  price: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

const productSchema = new Schema({
  name: { type: String, required: true },
  photo: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  unitPricing: { type: String, required: false },
  rateHistory: [rateHistorySchema],
});

const ProductSchemaValidation = z.object({
  name: z.string().min(1),
  photo: z.string().url(),
  description: z.string().min(1),
  price: z.number().positive(),
  unitPricing: z.string().optional(),
});

export const Product = model('Product', productSchema);
export { ProductSchemaValidation };