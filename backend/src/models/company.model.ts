import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  gstin?: string;
  stateCode?: string; // e.g., 'KA'
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  createdAt: Date;
}

const CompanySchema = new Schema<ICompany>({
  name: { type: String, required: true },
  gstin: String,
  stateCode: String,
  address: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    pincode: String
  },
  createdAt: { type: Date, default: Date.now }
});

export const Company = mongoose.model<ICompany>('Company', CompanySchema);
