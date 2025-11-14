// Migration script to drop legacy index and ensure correct unique index on InvoiceCounter
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
(async () => {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gst-billing';
  await mongoose.connect(MONGO_URI);
  const coll = mongoose.connection.collection('invoicecounters');
  try {
    const indexes = await coll.indexes();
    const legacy = indexes.find(i => i.name === 'userId_1_series_1_fy_1');
    if (legacy) {
      console.log('Dropping legacy index', legacy.name);
      await coll.dropIndex('userId_1_series_1_fy_1');
    } else {
      console.log('Legacy index not present');
    }
  } catch (e) {
    console.warn('Index check/drop warning:', e.message);
  }
  // Ensure current schema indexes
  const { InvoiceCounter } = require('../dist/models/invoiceCounter.model');
  await InvoiceCounter.syncIndexes();
  console.log('Indexes synced');
  await mongoose.disconnect();
})();
