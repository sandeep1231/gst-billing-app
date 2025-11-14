import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import mongoose from 'mongoose';
import { Purchase } from '../models/purchase.model';
import { Product } from '../models/product.model';

const router = Router();

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user._id as mongoose.Types.ObjectId;
  const companyId = (req.user.companyId || req.company?._id) as mongoose.Types.ObjectId;
  const { vendorName, vendorGstin, vendorStateCode, items = [], date = new Date(), notes } = req.body || {};
  const company = req.company;

  let subTotal = 0;
  let cgst = 0, sgst = 0, igst = 0;
  const resolvedItems: any[] = [];
  for (const it of items) {
    let prod: any = null;
    if (it.productId) prod = await Product.findOne({ _id: it.productId, companyId });
    const name = prod ? prod.name : it.name;
    const price = Number(it.price ?? (prod ? prod.price : 0));
    const qty = Number(it.qty ?? 1);
    const gstPercent = Number(it.gstPercent ?? (prod ? prod.gstPercent : 0));
    const line = price * qty;
    const tax = (line * gstPercent) / 100;
    subTotal += line;
    // Determine intra/inter based on vendor vs company state
    const compGstin = company?.gstin || '';
    const compStateCode = company?.stateCode || req.user.stateCode;
    const compGstState = compGstin?.slice(0, 2);
    const vendGstState = (vendorGstin?.slice(0,2) || vendorStateCode || '').toString().toUpperCase();
    const compState = (compGstState || compStateCode || '').toString().toUpperCase();
    const isIntra = (!!vendGstState && !!compState) ? vendGstState === compState : true;
    if (isIntra) { cgst += tax / 2; sgst += tax / 2; } else { igst += tax; }
    resolvedItems.push({ productId: prod?._id, name, qty, price, gstPercent });
  }
  const totalTax = cgst + sgst + igst;
  const total = subTotal + totalTax;

  const doc = await Purchase.create({ userId, companyId, vendorName, vendorGstin: (vendorGstin || '').toUpperCase() || undefined, vendorStateCode: (vendorStateCode || '').toUpperCase() || undefined, items: resolvedItems, date, subTotal, total, tax: { cgst, sgst, igst }, notes });
  res.json(doc);
});

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  const companyId = (req.user.companyId || req.company?._id) as mongoose.Types.ObjectId;
  const { page = 1, limit = 20, from, to, status, outstanding } = req.query as any;
  const filter: any = { companyId };
  if (from || to) {
    const range: any = {};
    if (from) { const d = new Date(from); if (!isNaN(d.getTime())) range.$gte = d; }
    if (to) { const d = new Date(to); if (!isNaN(d.getTime())) range.$lte = d; }
    if (Object.keys(range).length) filter.date = range;
  }
  if (status) {
    const valid = ['unpaid','partial','paid'];
    const s = String(status).toLowerCase();
    if (valid.includes(s)) filter.status = s;
  }
  if (String(outstanding).toLowerCase() === 'true') {
    filter.status = { $in: ['unpaid','partial'] };
  }
  const data = await Purchase.find(filter)
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .sort({ createdAt: -1 });
  if (data.length === 0) {
    const totalForCompany = await Purchase.countDocuments({ companyId });
    console.log('[PURCHASES] List EMPTY', { companyId, totalForCompany, filterStatus: filter.status });
  } else {
    console.log('[PURCHASES] List', { companyId, count: data.length, filterStatus: filter.status });
  }
  res.json(data);
});

// Update payment for a purchase (accounts payable)
async function updatePurchasePayment(req: AuthRequest, res: any) {
  const id = req.params.id;
  const { paidAmount } = req.body || {};
  const companyId = (req.user.companyId || req.company?._id) as mongoose.Types.ObjectId;
  const pur = await Purchase.findOne({ _id: id, companyId });
  if (!pur) return res.status(404).json({ error: 'not found' });
  const amt = Math.max(0, Math.min(Number(paidAmount || 0), Number(pur.total || 0)));
  pur.paidAmount = amt;
  const total = Number(pur.total || 0);
  pur.status = amt <= 0 ? 'unpaid' : (amt < total ? 'partial' : 'paid');
  await pur.save();
  return res.json(pur);
}

// Update payment for a purchase (accounts payable)
router.patch('/:id/payment', authMiddleware, updatePurchasePayment as any);
// Also accept PUT for compatibility with some clients
router.put('/:id/payment', authMiddleware, updatePurchasePayment as any);

export default router;
