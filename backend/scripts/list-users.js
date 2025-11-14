// Lists users in the database with email and createdAt
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
(async () => {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gst-billing';
  await mongoose.connect(MONGO_URI);
  const { User } = require('../dist/models/user.model');
  const users = await User.find({}).select('email createdAt companyId');
  console.log('User count:', users.length);
  users.forEach(u => console.log('-', u.email, 'companyId:', u.companyId));
  await mongoose.disconnect();
})();
