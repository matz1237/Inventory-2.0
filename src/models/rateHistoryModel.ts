import { Schema, model } from 'mongoose';

const rateHistorySchema = new Schema({
  price: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

export const RateHistory = model('RateHistory', rateHistorySchema);