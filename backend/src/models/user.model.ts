import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  shopName?: string;
  stateCode?: string;
  lang?: string;
  companyId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  shopName: String,
  stateCode: String,
  lang: { type: String, default: 'en' },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model<IUser>('User', UserSchema);
