// Utility script: prints a JWT for the first user (by email) in the database
// Usage: node scripts/print-token.js [email]
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gst-billing';
  const JWT_SECRET = process.env.JWT_SECRET || 'dev';
  await mongoose.connect(MONGO_URI);
  // Load model from compiled dist to avoid TS transpile during scripts
  const { User } = require('../dist/models/user.model');
  const email = process.argv[2] || 'demo@shop.com';
  const user = await User.findOne({ email });
  if (!user) {
    console.error('User not found for email:', email);
    process.exit(2);
  }
  const token = jwt.sign({ userId: user._id }, JWT_SECRET);
  console.log(token);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
