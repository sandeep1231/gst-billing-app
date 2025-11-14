import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceItem {
  productId?: mongoose.Types.ObjectId;
  name: string;
  qty: number;
  unit?: string;
  price: number;
  gstPercent: number;
  hsn?: string;
}

export interface IInvoice extends Document {
  userId: mongoose.Types.ObjectId; // created by
  companyId: mongoose.Types.ObjectId;
  invoiceNo: string;
  series: string;
  fy: string;
  date: Date;
  customerId?: mongoose.Types.ObjectId;
  customerSnapshot: any;
  items: IInvoiceItem[];
  tax: { cgst: number; sgst: number; igst: number };
  subTotal: number;
  total: number;
  roundOff?: number;
  notes?: string;
  pdfLocale?: 'en'|'hi'|'or';
  paidAmount?: number;
  status?: 'unpaid' | 'partial' | 'paid';
  createdAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  qty: Number,
  unit: String,
  price: Number,
  gstPercent: Number,
  hsn: String
});

const InvoiceSchema = new Schema<IInvoice>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  invoiceNo: { type: String, required: true, index: true },
  series: String,
  fy: String,
  date: { type: Date, default: Date.now },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  customerSnapshot: Schema.Types.Mixed,
  items: [InvoiceItemSchema],
  tax: Schema.Types.Mixed,
  subTotal: Number,
  total: Number,
  roundOff: Number,
  notes: String,
  pdfLocale: { type: String, enum: ['en','hi','or'], default: 'en' },
  paidAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['unpaid','partial','paid'], default: 'unpaid' },
  createdAt: { type: Date, default: Date.now }
});

InvoiceSchema.index({ userId: 1, invoiceNo: 1 });
InvoiceSchema.index({ companyId: 1, invoiceNo: 1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
