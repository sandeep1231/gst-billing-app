import mongoose, { Schema, Document } from 'mongoose';

export interface IAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface ICustomer extends Document {
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  name: string;
  phone?: string;
  gstin?: string;
  address?: IAddress;
  createdAt: Date;
}

const AddressSchema = new Schema<IAddress>({
  line1: String,
  line2: String,
  city: String,
  state: String,
  pincode: String
});

const CustomerSchema = new Schema<ICustomer>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  name: { type: String, required: true, index: true },
  phone: { type: String, index: true },
  gstin: String,
  address: AddressSchema,
  createdAt: { type: Date, default: Date.now }
});

CustomerSchema.index({ userId: 1, name: 1 });
CustomerSchema.index({ companyId: 1, name: 1 });
CustomerSchema.index({ userId: 1, phone: 1 });
CustomerSchema.index({ companyId: 1, phone: 1 });

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);
