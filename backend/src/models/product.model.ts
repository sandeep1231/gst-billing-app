import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  gstPercent: number;
  unit?: string;
  hsn?: string;
  openingQty?: number;
  createdAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  gstPercent: { type: Number, required: true },
  unit: String,
  hsn: String,
  openingQty: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

ProductSchema.index({ userId: 1, name: 1 });
ProductSchema.index({ companyId: 1, name: 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
