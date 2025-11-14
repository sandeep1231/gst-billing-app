import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import mongoose from 'mongoose';
import { Invoice } from '../models/invoice.model';
import { Product } from '../models/product.model';
import { Purchase } from '../models/purchase.model';

const router = Router();

// Helper: parse YYYY-MM-DD as local start/end of day; otherwise use Date parsing
// Interpret YYYY-MM-DD as IST (UTC+05:30) day boundaries, returning UTC Date objects.
// For datetime strings with time component we fall back to native parsing (assumed absolute).
const IST_OFFSET_MINUTES = 330; // +5h30m
function parseDateParam(value?: string, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    // Start of IST day in UTC is local UTC midnight minus offset.
    const startUtcMillis = Date.UTC(y, m - 1, d) - IST_OFFSET_MINUTES * 60_000; // 00:00 IST -> previous UTC evening
    if (!endOfDay) return new Date(startUtcMillis);
    const endUtcMillis = startUtcMillis + 24 * 60 * 60_000 - 1; // end of IST day
    return new Date(endUtcMillis);
  }
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? undefined : dt;
}

// GET /reports/stock - basic stock snapshot: openingQty - total sold qty (by product)
router.get('/stock', authMiddleware, async (req: AuthRequest, res) => {
  const companyId = (req.user.companyId || req.company?._id) as mongoose.Types.ObjectId;

  // Aggregate sold qty and revenue per product
  const sold = await Invoice.aggregate([
    { $match: { companyId } },
    { $unwind: '$items' },
    { $match: { 'items.productId': { $ne: null } } },
    { $group: { _id: '$items.productId', soldQty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } } } }
  ]);

  // Aggregate purchased qty per product
  const purchased = await Purchase.aggregate([
    { $match: { companyId } },
    { $unwind: '$items' },
    { $match: { 'items.productId': { $ne: null } } },
    { $group: { _id: '$items.productId', purchasedQty: { $sum: '$items.qty' } } }
  ]);

  const soldMap = new Map(sold.map(s => [String(s._id), s]));
  const purchaseMap = new Map(purchased.map(p => [String(p._id), p.purchasedQty]));

  // Compute across ALL products so items with only purchases or only opening qty still appear
  const products = await Product.find({ companyId });
  const rows = products.map(p => {
    const pid = String(p._id);
    const s = soldMap.get(pid);
    const opening = Number(p.openingQty || 0);
    const add = Number(purchaseMap.get(pid) || 0);
    const soldQty = Number(s?.soldQty || 0);
    const onHand = opening + add - soldQty;
    return {
      productId: p._id,
      name: p.name,
      unit: p.unit,
      openingQty: opening,
      purchasedQty: add,
      soldQty,
      onHand,
      price: p.price,
      revenue: Number(s?.revenue || 0)
    };
  });

  rows.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  res.json(rows);
});

// GET /reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns aggregate totals and tax breakdown for invoices in range
router.get('/sales', authMiddleware, async (req: AuthRequest, res) => {
  const companyId = (req.user.companyId || req.company?._id) as mongoose.Types.ObjectId;
  const { from, to, q } = req.query as any;
  const match: any = { companyId };
  if (from || to) {
    const range: any = {};
    const fromDt = parseDateParam(from, false);
    const toDt = parseDateParam(to, true);
    if (fromDt) range.$gte = fromDt;
    if (toDt) range.$lte = toDt;
    if (Object.keys(range).length) match.date = range;
  }

  const pipeline: any[] = [{ $match: match }];
  if (q) {
    const rx = new RegExp(String(q), 'i');
    pipeline.push({ $match: { $or: [ { invoiceNo: rx }, { 'customerSnapshot.name': rx } ] } });
  }

  const rows = await Invoice.aggregate([
    ...pipeline,
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        subTotal: { $sum: '$subTotal' },
        total: { $sum: '$total' },
        paid: { $sum: { $ifNull: ['$paidAmount', 0] } },
        cgst: { $sum: { $ifNull: ['$tax.cgst', 0] } },
        sgst: { $sum: { $ifNull: ['$tax.sgst', 0] } },
        igst: { $sum: { $ifNull: ['$tax.igst', 0] } }
      }
    }
  ]);

  const r = rows[0] || { count: 0, subTotal: 0, total: 0, paid: 0, cgst: 0, sgst: 0, igst: 0 };
  const due = Number((Number(r.total || 0) - Number(r.paid || 0)).toFixed(2));
  const agg = { count: r.count || 0, subTotal: r.subTotal || 0, total: r.total || 0, cgst: r.cgst || 0, sgst: r.sgst || 0, igst: r.igst || 0, due } as any;
  res.json(agg);
});

// GET /reports/counts - quick entity counts
router.get('/counts', authMiddleware, async (req: AuthRequest, res) => {
  const companyId = (req.user.companyId || req.company?._id) as mongoose.Types.ObjectId;
  const [products, customers, invoices] = await Promise.all([
    Product.countDocuments({ companyId }),
    (await import('../models/customer.model')).Customer.countDocuments({ companyId }),
    (await import('../models/invoice.model')).Invoice.countDocuments({ companyId })
  ]);
  res.json({ products, customers, invoices });
});

// GET /reports/valuation?date=YYYY-MM-DD
// Returns total stock value using weighted average cost (from purchases up to date)
router.get('/valuation', authMiddleware, async (req: AuthRequest, res) => {
  const companyId = (req.user.companyId || req.company?._id) as mongoose.Types.ObjectId;
  const { date } = req.query as any;
  const cutoff = date ? new Date(date) : new Date();

  // On-hand per product (as of now) from stock API logic
  const sold = await Invoice.aggregate([
    { $match: { companyId, date: { $lte: cutoff } } },
    { $unwind: '$items' },
    { $match: { 'items.productId': { $ne: null } } },
    { $group: { _id: '$items.productId', soldQty: { $sum: '$items.qty' } } }
  ]);
  const purchased = await Purchase.aggregate([
    { $match: { companyId, date: { $lte: cutoff } } },
    { $unwind: '$items' },
    { $match: { 'items.productId': { $ne: null } } },
    { $group: { _id: '$items.productId', qty: { $sum: '$items.qty' }, cost: { $sum: { $multiply: ['$items.qty', '$items.price'] } } } }
  ]);

  const purchaseMap = new Map(purchased.map(p => [String(p._id), p]));
  const soldMap = new Map(sold.map(s => [String(s._id), s.soldQty]));
  const ids = Array.from(new Set([...sold.map(s => String(s._id)), ...purchased.map(p => String(p._id))]));
  const products = await Product.find({ companyId, _id: { $in: ids } });

  let totalValue = 0;
  for (const p of products) {
    const pid = String(p._id);
    const opening = p.openingQty || 0; // opening treated as zero-cost for valuation unless purchases exist
    const pur = purchaseMap.get(pid) || { qty: 0, cost: 0 };
    const soldQty = Number(soldMap.get(pid) || 0);
    const onHand = opening + pur.qty - soldQty;
    if (onHand <= 0) continue;
    const avgCost = pur.qty > 0 ? (pur.cost / pur.qty) : 0;
    totalValue += onHand * avgCost;
  }

  res.json({ date: cutoff, stockValue: Number(totalValue.toFixed(2)) });
});

// GET /reports/pl?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns revenue, COGS (weighted average cost), and grossProfit for the period
router.get('/pl', authMiddleware, async (req: AuthRequest, res) => {
  const companyId = (req.user.companyId || req.company?._id) as mongoose.Types.ObjectId;
  const { from, to } = req.query as any;
  const match: any = { companyId };
  const range: any = {};
  const fromDt = parseDateParam(from, false);
  const toDt = parseDateParam(to, true);
  if (fromDt) range.$gte = fromDt;
  if (toDt) range.$lte = toDt;
  if (Object.keys(range).length) match.date = range;

  // Sold qty and revenue in period
  const sold = await Invoice.aggregate([
    { $match: match },
    { $unwind: '$items' },
    { $match: { 'items.productId': { $ne: null } } },
    { $group: { _id: '$items.productId', qty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } } } }
  ]);

  // Average cost up to 'to' (or now if not provided)
  const cutoff = toDt || new Date();
  const purchases = await Purchase.aggregate([
    { $match: { companyId, date: { $lte: cutoff } } },
    { $unwind: '$items' },
    { $match: { 'items.productId': { $ne: null } } },
    { $group: { _id: '$items.productId', qty: { $sum: '$items.qty' }, cost: { $sum: { $multiply: ['$items.qty', '$items.price'] } } } }
  ]);

  const puMap = new Map(purchases.map(p => [String(p._id), p]));
  let revenue = 0; let cogs = 0;
  for (const s of sold) {
    const avg = puMap.get(String(s._id));
    const avgCost = avg && avg.qty > 0 ? (avg.cost / avg.qty) : 0;
    revenue += s.revenue || 0;
    cogs += (s.qty || 0) * avgCost;
  }
  const grossProfit = revenue - cogs;
  res.json({ revenue: Number(revenue.toFixed(2)), cogs: Number(cogs.toFixed(2)), grossProfit: Number(grossProfit.toFixed(2)) });
});

// GET /reports/balance-sheet?date=YYYY-MM-DD
// Returns a simplified balance sheet snapshot (Assets: Inventory + AccountsReceivable; Liabilities: AccountsPayable; Equity as balancing figure)
router.get('/balance-sheet', authMiddleware, async (req: AuthRequest, res) => {
  const companyId = (req.user.companyId || req.company?._id) as mongoose.Types.ObjectId;
  const { date } = req.query as any;
  // Treat YYYY-MM-DD as end-of-day IST to include the whole day
  const cutoff = date ? (parseDateParam(String(date), true) as Date) : new Date();

  // Accounts Receivable: invoices up to cutoff
  const invs = await Invoice.aggregate([
    { $match: { companyId, date: { $lte: cutoff } } },
    { $project: { total: 1, paidAmount: { $ifNull: ['$paidAmount', 0] } } },
    { $project: { due: { $subtract: ['$total', '$paidAmount'] } } },
    { $match: { due: { $gt: 0 } } },
    { $group: { _id: null, receivable: { $sum: '$due' } } }
  ]);
  const accountsReceivable = Number((invs[0]?.receivable || 0).toFixed(2));

  // Accounts Payable: purchases up to cutoff
  const purs = await Purchase.aggregate([
    { $match: { companyId, date: { $lte: cutoff } } },
    { $project: { total: 1, paidAmount: { $ifNull: ['$paidAmount', 0] } } },
    { $project: { due: { $subtract: ['$total', '$paidAmount'] } } },
    { $match: { due: { $gt: 0 } } },
    { $group: { _id: null, payable: { $sum: '$due' } } }
  ]);
  const accountsPayable = Number((purs[0]?.payable || 0).toFixed(2));

  // Inventory valuation
  // Reuse logic: purchases and invoices up to cutoff (weighted average cost)
  const sold = await Invoice.aggregate([
    { $match: { companyId, date: { $lte: cutoff } } },
    { $unwind: '$items' },
    { $match: { 'items.productId': { $ne: null } } },
    { $group: { _id: '$items.productId', soldQty: { $sum: '$items.qty' } } }
  ]);
  const purchased = await Purchase.aggregate([
    { $match: { companyId, date: { $lte: cutoff } } },
    { $unwind: '$items' },
    { $match: { 'items.productId': { $ne: null } } },
    { $group: { _id: '$items.productId', qty: { $sum: '$items.qty' }, cost: { $sum: { $multiply: ['$items.qty', '$items.price'] } } } }
  ]);
  const purchaseMap = new Map(purchased.map(p => [String(p._id), p]));
  const soldMap = new Map(sold.map(s => [String(s._id), s.soldQty]));
  const ids = Array.from(new Set([...sold.map(s => String(s._id)), ...purchased.map(p => String(p._id))]));
  const products = await Product.find({ companyId, _id: { $in: ids } });
  let inventory = 0;
  for (const p of products) {
    const pid = String(p._id);
    const opening = p.openingQty || 0;
    const pur = purchaseMap.get(pid) || { qty: 0, cost: 0 };
    const soldQty = Number(soldMap.get(pid) || 0);
    const onHand = opening + pur.qty - soldQty;
    if (onHand <= 0) continue;
    const avgCost = pur.qty > 0 ? (pur.cost / pur.qty) : 0;
    inventory += onHand * avgCost;
  }
  inventory = Number(inventory.toFixed(2));

  const assets = inventory + accountsReceivable;
  const liabilities = accountsPayable;
  const equity = Number((assets - liabilities).toFixed(2));
  res.json({ asOf: cutoff, assets: { inventory, accountsReceivable, total: assets }, liabilities: { accountsPayable, total: liabilities }, equity });
});

// GET /reports/balance-sheet-range?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns two snapshots (start/end) and deltas for assets, liabilities, equity
router.get('/balance-sheet-range', authMiddleware, async (req: AuthRequest, res) => {
  const companyId = (req.user.companyId || req.company?._id) as mongoose.Types.ObjectId;
  const { from, to } = req.query as any;
  // Snapshots are taken as end-of-day IST for provided dates
  const fromDate = from ? (parseDateParam(String(from), true) as Date) : new Date();
  const toDate = to ? (parseDateParam(String(to), true) as Date) : new Date();

  async function snapshot(cutoff: Date) {
    // Accounts Receivable up to cutoff
    const invs = await Invoice.aggregate([
      { $match: { companyId, date: { $lte: cutoff } } },
      { $project: { total: 1, paidAmount: { $ifNull: ['$paidAmount', 0] } } },
      { $project: { due: { $subtract: ['$total', '$paidAmount'] } } },
      { $match: { due: { $gt: 0 } } },
      { $group: { _id: null, receivable: { $sum: '$due' } } }
    ]);
    const accountsReceivable = Number((invs[0]?.receivable || 0).toFixed(2));

    // Accounts Payable up to cutoff
    const purs = await Purchase.aggregate([
      { $match: { companyId, date: { $lte: cutoff } } },
      { $project: { total: 1, paidAmount: { $ifNull: ['$paidAmount', 0] } } },
      { $project: { due: { $subtract: ['$total', '$paidAmount'] } } },
      { $match: { due: { $gt: 0 } } },
      { $group: { _id: null, payable: { $sum: '$due' } } }
    ]);
    const accountsPayable = Number((purs[0]?.payable || 0).toFixed(2));

    // Inventory valuation (weighted avg cost) up to cutoff
    const sold = await Invoice.aggregate([
      { $match: { companyId, date: { $lte: cutoff } } },
      { $unwind: '$items' },
      { $match: { 'items.productId': { $ne: null } } },
      { $group: { _id: '$items.productId', soldQty: { $sum: '$items.qty' } } }
    ]);
    const purchased = await Purchase.aggregate([
      { $match: { companyId, date: { $lte: cutoff } } },
      { $unwind: '$items' },
      { $match: { 'items.productId': { $ne: null } } },
      { $group: { _id: '$items.productId', qty: { $sum: '$items.qty' }, cost: { $sum: { $multiply: ['$items.qty', '$items.price'] } } } }
    ]);
    const purchaseMap = new Map(purchased.map(p => [String(p._id), p]));
    const soldMap = new Map(sold.map(s => [String(s._id), s.soldQty]));
    const ids = Array.from(new Set([...sold.map(s => String(s._id)), ...purchased.map(p => String(p._id))]));
    const products = await Product.find({ companyId, _id: { $in: ids } });
    let inventory = 0;
    for (const p of products) {
      const pid = String(p._id);
      const opening = p.openingQty || 0;
      const pur = purchaseMap.get(pid) || { qty: 0, cost: 0 };
      const soldQty = Number(soldMap.get(pid) || 0);
      const onHand = opening + pur.qty - soldQty;
      if (onHand <= 0) continue;
      const avgCost = pur.qty > 0 ? (pur.cost / pur.qty) : 0;
      inventory += onHand * avgCost;
    }
    inventory = Number(inventory.toFixed(2));
    const assetsTotal = inventory + accountsReceivable;
    const liabilitiesTotal = accountsPayable;
    const equity = Number((assetsTotal - liabilitiesTotal).toFixed(2));
    return {
      asOf: cutoff,
      assets: { inventory, accountsReceivable, total: assetsTotal },
      liabilities: { accountsPayable, total: liabilitiesTotal },
      equity
    };
  }

  try {
    const startSnap = await snapshot(fromDate);
    const endSnap = await snapshot(toDate);
    const delta = {
      assets: Number((endSnap.assets.total - startSnap.assets.total).toFixed(2)),
      liabilities: Number((endSnap.liabilities.total - startSnap.liabilities.total).toFixed(2)),
      equity: Number((endSnap.equity - startSnap.equity).toFixed(2))
    };
    res.json({ from: startSnap, to: endSnap, delta });
  } catch (err) {
    console.error('[BALANCE-SHEET-RANGE] Error', err);
    res.status(500).json({ error: 'range_failed' });
  }
});

// GET /reports/gstr1?from=YYYY-MM-DD&to=YYYY-MM-DD
// Basic GSTR-1 style summary for outward supplies: totals, by party type, by supply type, by GST rate, and simple HSN summary
router.get('/gstr1', authMiddleware, async (req: AuthRequest, res) => {
  const companyId = (req.user.companyId || req.company?._id) as mongoose.Types.ObjectId;
  const { from, to } = req.query as any;
  const match: any = { companyId };
  const range: any = {};
  const fromDt = parseDateParam(from, false);
  const toDt = parseDateParam(to, true);
  if (fromDt) range.$gte = fromDt;
  if (toDt) range.$lte = toDt;
  if (Object.keys(range).length) match.date = range;

  const invoices = await Invoice.find(match, { date: 1, items: 1, tax: 1, subTotal: 1, total: 1, customerSnapshot: 1 }).lean();

  const result: any = {
    period: { from: from || null, to: to || null },
    totals: { taxableValue: 0, igst: 0, cgst: 0, sgst: 0, total: 0 },
    byPartyType: { b2b: { taxableValue: 0, igst: 0, cgst: 0, sgst: 0, total: 0 }, b2c: { taxableValue: 0, igst: 0, cgst: 0, sgst: 0, total: 0 } },
    bySupplyType: { intra: { taxableValue: 0, cgst: 0, sgst: 0, total: 0 }, inter: { taxableValue: 0, igst: 0, total: 0 } },
    byRate: [] as Array<{ rate: number; taxableValue: number; igst: number; cgst: number; sgst: number; total: number }>,
    byHsn: [] as Array<{ hsn: string; taxableValue: number; tax: number; total: number }>
  };

  const byRateMap = new Map<number, { rate: number; taxableValue: number; igst: number; cgst: number; sgst: number; total: number }>();
  const byHsnMap = new Map<string, { hsn: string; taxableValue: number; tax: number; total: number }>();

  for (const inv of invoices) {
    const isInter = (inv.tax?.igst || 0) > 0.0001; // treat invoice-level IGST>0 as inter-state supply
    const isB2B = !!(inv.customerSnapshot && inv.customerSnapshot.gstin);
    const partyBucket = isB2B ? result.byPartyType.b2b : result.byPartyType.b2c;

    // Totals from invoice level
    const taxable = Number(inv.subTotal || 0);
    const cgst = Number(inv.tax?.cgst || 0);
    const sgst = Number(inv.tax?.sgst || 0);
    const igst = Number(inv.tax?.igst || 0);
    const total = Number(inv.total || (taxable + cgst + sgst + igst));

    result.totals.taxableValue += taxable;
    result.totals.cgst += cgst; result.totals.sgst += sgst; result.totals.igst += igst; result.totals.total += total;

    partyBucket.taxableValue += taxable; partyBucket.total += total; partyBucket.cgst = (partyBucket.cgst || 0) + cgst; partyBucket.sgst = (partyBucket.sgst || 0) + sgst; partyBucket.igst = (partyBucket.igst || 0) + igst;

    if (isInter) {
      result.bySupplyType.inter.taxableValue += taxable;
      result.bySupplyType.inter.igst += igst;
      result.bySupplyType.inter.total = result.bySupplyType.inter.taxableValue + result.bySupplyType.inter.igst;
    } else {
      result.bySupplyType.intra.taxableValue += taxable;
      result.bySupplyType.intra.cgst += cgst; result.bySupplyType.intra.sgst += sgst;
      result.bySupplyType.intra.total = result.bySupplyType.intra.taxableValue + result.bySupplyType.intra.cgst + result.bySupplyType.intra.sgst;
    }

    // By Rate and HSN from line items
    for (const it of (inv.items || [])) {
      const rate = Number(it.gstPercent || 0);
      const lineTaxable = Number(it.qty || 0) * Number(it.price || 0);
      if (lineTaxable <= 0) continue;

      let r = byRateMap.get(rate);
      if (!r) { r = { rate, taxableValue: 0, igst: 0, cgst: 0, sgst: 0, total: 0 }; byRateMap.set(rate, r); }
      r.taxableValue += lineTaxable;
      if (isInter) {
        const t = lineTaxable * rate / 100;
        r.igst += t; r.total += lineTaxable + t;
      } else {
        const t = lineTaxable * rate / 100;
        r.cgst += t / 2; r.sgst += t / 2; r.total += lineTaxable + t;
      }

      if (it.hsn) {
        const key = String(it.hsn);
        let h = byHsnMap.get(key);
        if (!h) { h = { hsn: key, taxableValue: 0, tax: 0, total: 0 }; byHsnMap.set(key, h); }
        const t = lineTaxable * rate / 100;
        h.taxableValue += lineTaxable; h.tax += t; h.total += lineTaxable + t;
      }
    }
  }

  result.totals.taxableValue = Number(result.totals.taxableValue.toFixed(2));
  result.totals.cgst = Number(result.totals.cgst.toFixed(2));
  result.totals.sgst = Number(result.totals.sgst.toFixed(2));
  result.totals.igst = Number(result.totals.igst.toFixed(2));
  result.totals.total = Number(result.totals.total.toFixed(2));

  for (const k of ['b2b','b2c'] as const) {
    const b = result.byPartyType[k];
    b.taxableValue = Number((b.taxableValue || 0).toFixed(2));
    b.cgst = Number((b.cgst || 0).toFixed(2));
    b.sgst = Number((b.sgst || 0).toFixed(2));
    b.igst = Number((b.igst || 0).toFixed(2));
    b.total = Number((b.total || 0).toFixed(2));
  }
  result.bySupplyType.intra.taxableValue = Number(result.bySupplyType.intra.taxableValue.toFixed(2));
  result.bySupplyType.intra.cgst = Number(result.bySupplyType.intra.cgst.toFixed(2));
  result.bySupplyType.intra.sgst = Number(result.bySupplyType.intra.sgst.toFixed(2));
  result.bySupplyType.intra.total = Number(result.bySupplyType.intra.total.toFixed(2));
  result.bySupplyType.inter.taxableValue = Number(result.bySupplyType.inter.taxableValue.toFixed(2));
  result.bySupplyType.inter.igst = Number(result.bySupplyType.inter.igst.toFixed(2));
  result.bySupplyType.inter.total = Number(result.bySupplyType.inter.total.toFixed(2));

  result.byRate = Array.from(byRateMap.values()).sort((a, b) => a.rate - b.rate).map(r => ({
    rate: r.rate,
    taxableValue: Number(r.taxableValue.toFixed(2)),
    igst: Number(r.igst.toFixed(2)),
    cgst: Number(r.cgst.toFixed(2)),
    sgst: Number(r.sgst.toFixed(2)),
    total: Number(r.total.toFixed(2))
  }));
  result.byHsn = Array.from(byHsnMap.values()).sort((a, b) => a.hsn.localeCompare(b.hsn)).map(h => ({
    hsn: h.hsn,
    taxableValue: Number(h.taxableValue.toFixed(2)),
    tax: Number(h.tax.toFixed(2)),
    total: Number(h.total.toFixed(2))
  }));

  res.json(result);
});

// GET /reports/gstr3b?from=YYYY-MM-DD&to=YYYY-MM-DD
// Basic GSTR-3B style summary: outward tax liability and input tax credit (ITC) summary
router.get('/gstr3b', authMiddleware, async (req: AuthRequest, res) => {
  const companyId = (req.user.companyId || req.company?._id) as mongoose.Types.ObjectId;
  const { from, to } = req.query as any;
  const match: any = { companyId };
  const range: any = {};
  const fromDt = parseDateParam(from, false);
  const toDt = parseDateParam(to, true);
  if (fromDt) range.$gte = fromDt;
  if (toDt) range.$lte = toDt;
  if (Object.keys(range).length) match.date = range;

  const invoices = await Invoice.find(match, { subTotal: 1, tax: 1 }).lean();
  const out = invoices.reduce((acc, inv) => {
    acc.taxableValue += Number(inv.subTotal || 0);
    acc.cgst += Number(inv.tax?.cgst || 0);
    acc.sgst += Number(inv.tax?.sgst || 0);
    acc.igst += Number(inv.tax?.igst || 0);
    return acc;
  }, { taxableValue: 0, cgst: 0, sgst: 0, igst: 0 });
  const outward = {
    taxableValue: Number(out.taxableValue.toFixed(2)),
    cgst: Number(out.cgst.toFixed(2)), sgst: Number(out.sgst.toFixed(2)), igst: Number(out.igst.toFixed(2)),
    totalTax: Number((out.cgst + out.sgst + out.igst).toFixed(2)),
    grossValue: Number((out.taxableValue + out.cgst + out.sgst + out.igst).toFixed(2))
  };

  const purchases = await Purchase.find(match, { subTotal: 1, tax: 1 }).lean();
  const itc = purchases.reduce((acc, pu: any) => {
    acc.taxableValue += Number(pu.subTotal || 0);
    acc.cgst += Number(pu.tax?.cgst || 0);
    acc.sgst += Number(pu.tax?.sgst || 0);
    acc.igst += Number(pu.tax?.igst || 0);
    return acc;
  }, { taxableValue: 0, cgst: 0, sgst: 0, igst: 0 });
  const inward = {
    taxableValue: Number(itc.taxableValue.toFixed(2)),
    cgst: Number(itc.cgst.toFixed(2)),
    sgst: Number(itc.sgst.toFixed(2)),
    igst: Number(itc.igst.toFixed(2)),
    totalTax: Number((itc.cgst + itc.sgst + itc.igst).toFixed(2))
  };

  const netTaxPayable = Number(Math.max(0, outward.totalTax - inward.totalTax).toFixed(2));
  res.json({ period: { from: from || null, to: to || null }, outward, inward, netTaxPayable });
});

export default router;
