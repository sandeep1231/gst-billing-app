import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchaseItem {
  productId?: mongoose.Types.ObjectId;
  name: string;
  qty: number;
  price: number;
  gstPercent?: number;
}

export interface IPurchase extends Document {
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  date: Date;
  vendorName?: string;
  vendorGstin?: string;
  vendorStateCode?: string;
  items: IPurchaseItem[];
  subTotal: number;
  total: number;
  tax?: { cgst: number; sgst: number; igst: number };
  notes?: string;
  paidAmount?: number;
  status?: 'unpaid' | 'partial' | 'paid';
  createdAt: Date;
}

const PurchaseItemSchema = new Schema<IPurchaseItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, required: true },
  qty: { type: Number, required: true },
  price: { type: Number, required: true },
  gstPercent: { type: Number }
});

const PurchaseSchema = new Schema<IPurchase>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  date: { type: Date, default: Date.now },
  vendorName: String,
  vendorGstin: String,
  vendorStateCode: String,
  items: [PurchaseItemSchema],
  subTotal: Number,
  total: Number,
  tax: Schema.Types.Mixed,
  notes: String,
  paidAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['unpaid','partial','paid'], default: 'unpaid' },
  createdAt: { type: Date, default: Date.now }
});

PurchaseSchema.index({ companyId: 1, createdAt: -1 });

export const Purchase = mongoose.model<IPurchase>('Purchase', PurchaseSchema);
