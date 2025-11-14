import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { User } from '../models/user.model';
import { Customer } from '../models/customer.model';
import { Product } from '../models/product.model';
import { Company } from '../models/company.model';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/gst-billing');
  await User.deleteMany({});
  await Customer.deleteMany({});
  await Product.deleteMany({});
  await Company.deleteMany({});

  const passwordHash = await bcrypt.hash('demo1234', 10);
  const company = await Company.create({ name: 'Demo Shop', gstin: '29ABCDE1234F2Z5', stateCode: 'KA', address: { line1: 'MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' } });
  const user = await User.create({ email: 'demo@shop.com', passwordHash, shopName: 'Demo Shop', stateCode: 'KA', companyId: company._id });

  await Customer.create({ userId: user._id, companyId: company._id, name: 'Ram Kumar', phone: '9123456789', gstin: '29ABCDE1234F2Z5', address: { line1: 'MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' } });
  await Product.create({ userId: user._id, companyId: company._id, name: 'Rice 5kg', price: 250, gstPercent: 5, unit: 'kg' });
  console.log('seeded');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
