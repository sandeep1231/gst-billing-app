import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceCounter extends Document {
  userId: mongoose.Types.ObjectId; // creator
  companyId: mongoose.Types.ObjectId;
  series: string;
  fy: string;
  seq: number;
}

const InvoiceCounterSchema = new Schema<IInvoiceCounter>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  series: { type: String, required: true },
  fy: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

InvoiceCounterSchema.index({ companyId: 1, series: 1, fy: 1 }, { unique: true });

export const InvoiceCounter = mongoose.model<IInvoiceCounter>('InvoiceCounter', InvoiceCounterSchema);
