import { Router } from 'express';
import { Invoice } from '../models/invoice.model';
import { InvoiceCounter } from '../models/invoiceCounter.model';
import { Product } from '../models/product.model';
import { Customer } from '../models/customer.model';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import mongoose from 'mongoose';

const router = Router();

function currentFY(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const fyStart = m >= 4 ? y : y - 1;
  const fyEnd = fyStart + 1;
  return `${String(fyStart).slice(2)}-${String(fyEnd).slice(2)}`;
}

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user._id as mongoose.Types.ObjectId;
  const companyId = (req.user.companyId || req.company?._id) as mongoose.Types.ObjectId;
  const company = req.company;
  const { customerId, items, series = 'MAIN', date = new Date(), notes, pdfLocale = 'en' } = req.body;

  // get counter
  const fy = currentFY(new Date(date));
  const counter = await InvoiceCounter.findOneAndUpdate(
    { companyId, series, fy },
    { $inc: { seq: 1 }, $setOnInsert: { userId, companyId, series, fy } },
    { upsert: true, new: true }
  );
  const seq = counter.seq;
  const invoiceNo = `${fy}/${series}/${String(seq).padStart(6, '0')}`;

  const customer = customerId ? await Customer.findOne({ _id: customerId, companyId }) : null;
  // Allow manual entry: if no customerId but a name is provided in body, use it as snapshot
  const manualSnapshot = (() => {
    const body: any = req.body || {};
    const name = (body.customerSnapshot?.name
      || body.customerName
      || (typeof body.customer === 'string' ? body.customer : '')
      || '').toString().trim();
    if (!name) return null;
    return {
      name,
      phone: (body.customerSnapshot?.phone || body.mobile || '').toString(),
      gstin: (body.customerSnapshot?.gstin || body.gstin || '').toString(),
      address: body.customerSnapshot?.address || body.address || ''
    } as any;
  })();

  const customerSnapshot = customer
    ? { name: customer.name, phone: customer.phone, gstin: customer.gstin, address: customer.address }
    : (manualSnapshot || { name: 'Walk-in', phone: '', gstin: '' });

  // compute totals
  let subTotal = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  const resolvedItems = [] as any[];
  for (const it of items) {
    let prod = null;
    if (it.productId) prod = await Product.findOne({ _id: it.productId, companyId });
    const name = prod ? prod.name : it.name;
    const price = it.price ?? (prod ? prod.price : 0);
    const qty = it.qty ?? 1;
    const gstPercent = it.gstPercent ?? (prod ? prod.gstPercent : 0);
    const line = price * qty;
    const tax = (line * gstPercent) / 100;
    subTotal += line;
    // Indian GST rule (simplified): intra-state => CGST+SGST split; inter-state => IGST
    // Prefer GSTIN first two digits if available; fallback to stateCode match.
    const compGstin = company?.gstin || '';
    const custGstin = customer?.gstin || '';
    const compStateCode = company?.stateCode || req.user.stateCode;
    const compGstState = compGstin?.slice(0, 2);
    const custGstState = custGstin?.slice(0, 2);
    const isIntra = (compGstState && custGstState)
      ? compGstState === custGstState
      : (!!customer && (customer.address?.state === compStateCode));
    if (isIntra) {
      cgst += tax / 2;
      sgst += tax / 2;
    } else {
      igst += tax;
    }
    resolvedItems.push({ productId: prod?._id, name, qty, price, gstPercent, hsn: prod?.hsn });
  }
  const totalTax = cgst + sgst + igst;
  const total = subTotal + totalTax;

  const inv = await Invoice.create({
    userId,
    companyId,
    invoiceNo,
    series,
    fy,
    date,
    customerId,
    customerSnapshot,
    items: resolvedItems,
    tax: { cgst, sgst, igst },
    subTotal,
    total,
    notes,
    pdfLocale
  });

  res.json(inv);
});

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  const { from, to, page = 1, limit = 20, q, status, outstanding } = req.query as any;
  const companyId = req.user.companyId || req.company?._id;
  const filter: any = { companyId };
  if (from || to) {
    const range: any = {};
    if (from) { const d = new Date(from); if (!isNaN(d.getTime())) range.$gte = d; }
    if (to) { const d = new Date(to); if (!isNaN(d.getTime())) range.$lte = d; }
    if (Object.keys(range).length) filter.date = range;
  }
  if (q) {
    const rx = { $regex: String(q), $options: 'i' };
    filter.$or = [ { invoiceNo: rx }, { 'customerSnapshot.name': rx } ];
  }
  if (status) {
    const valid = ['unpaid','partial','paid'];
    const s = String(status).toLowerCase();
    if (valid.includes(s)) filter.status = s;
  }
  if (String(outstanding).toLowerCase() === 'true') {
    filter.status = { $in: ['unpaid','partial'] };
  }
  const data = await Invoice.find(filter)
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .sort({ createdAt: -1 });
  if (data.length === 0) {
    const totalForCompany = await Invoice.countDocuments({ companyId });
    console.log('[INVOICES] List EMPTY', { companyId, q: q || '', totalForCompany, filterStatus: filter.status });
  } else {
    console.log('[INVOICES] List', { companyId, count: data.length, q: q || '', filterStatus: filter.status });
  }
  res.json(data);
});

// CSV export of invoices with filters applied
router.get('/export', authMiddleware, async (req: AuthRequest, res) => {
  const { from, to, q } = req.query as any;
  const companyId = req.user.companyId || req.company?._id;
  const filter: any = { companyId };
  if (from || to) {
    const range: any = {};
    if (from) { const d = new Date(from); if (!isNaN(d.getTime())) range.$gte = d; }
    if (to) { const d = new Date(to); if (!isNaN(d.getTime())) range.$lte = d; }
    if (Object.keys(range).length) filter.date = range;
  }
  if (q) {
    const rx = { $regex: String(q), $options: 'i' };
    filter.$or = [ { invoiceNo: rx }, { 'customerSnapshot.name': rx } ];
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="invoices_export.csv"');

  const esc = (v: any) => {
    if (v === undefined || v === null) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };

  res.write(['Invoice No','Date','Customer','Sub Total','Tax','Total'].join(',') + '\n');

  const cursor = Invoice.find(filter).sort({ createdAt: -1 }).cursor();
  try {
    for await (const inv of cursor as any) {
      const name = inv.customerSnapshot?.name || 'Walk-in';
      const date = inv.date ? new Date(inv.date).toISOString().substring(0,10) : '';
      const subTotal = Number(inv.subTotal || 0);
      const tax = Number((inv.tax?.cgst || 0) + (inv.tax?.sgst || 0) + (inv.tax?.igst || 0));
      const total = Number(inv.total || 0);
      const row = [esc(inv.invoiceNo), esc(date), esc(name), subTotal, tax, total].join(',');
      res.write(row + '\n');
    }
  } catch (e) {
    // ensure we end the response on error
  }
  res.end();
});

router.get('/:id/pdf', authMiddleware, async (req: AuthRequest, res) => {
  const id = req.params.id;
  const companyId = req.user.companyId || req.company?._id;
  const inv = await Invoice.findOne({ _id: id, companyId });
  if (!inv) return res.status(404).json({ error: 'not found' });
  console.log('[INVOICE PDF] using pdfkit only', { invoiceId: id, companyId });
  try {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${(inv.invoiceNo || 'invoice')}.pdf"`);
    doc.pipe(res);

    const company = req.company as any;
    const customer = (inv as any).customerSnapshot || {};

    doc.fontSize(18).text(company?.name || 'Tax Invoice');
    if (company?.gstin) doc.fontSize(10).text(`GSTIN: ${company.gstin}`);
    if (company?.address) {
      const a = company.address as any;
      [a.line1, a.line2, [a.city, a.state, a.pincode].filter(Boolean).join(', ')].filter(Boolean).forEach((ln: string) => doc.text(ln));
    }
    doc.moveDown();

    doc.fontSize(11).text(`Invoice No: ${inv.invoiceNo}`);
    doc.text(`Date: ${new Date(inv.date).toLocaleDateString()}`);
    doc.text(`Bill To: ${customer.name || 'Walk-in'}`);
    if (customer.address) doc.text(String(customer.address));
    doc.moveDown();

    // Table header
    const startY = doc.y;
    const cols = [40, 300, 360, 420, 480];
    doc.fontSize(11).text('Item', cols[0], startY);
    doc.text('Qty', cols[1], startY, { width: 40, align: 'right' });
    doc.text('Price (Rs)', cols[2], startY, { width: 50, align: 'right' });
    doc.text('GST %', cols[3], startY, { width: 50, align: 'right' });
    doc.text('Amount (Rs)', cols[4], startY, { width: 60, align: 'right' });
    doc.moveTo(40, startY + 14).lineTo(550, startY + 14).stroke();
    let y = startY + 20;

    const fmtVal = (v: number) => Number(v).toFixed(2); // numeric only; 'Rs' moved to labels
    for (const it of (inv as any).items) {
      const lineAmt = Number(it.qty) * Number(it.price);
      doc.fontSize(10).text(it.name, cols[0], y, { width: 250 });
      doc.text(String(it.qty), cols[1], y, { width: 40, align: 'right' });
      doc.text(fmtVal(Number(it.price)), cols[2], y, { width: 50, align: 'right' });
      doc.text(String(it.gstPercent || 0), cols[3], y, { width: 50, align: 'right' });
      doc.text(fmtVal(lineAmt), cols[4], y, { width: 60, align: 'right' });
      y += 16;
      if (y > doc.page.height - 60) { doc.addPage(); y = 60; }
    }

    // Totals box
    doc.moveTo(300, y + 4).lineTo(550, y + 4).stroke();
    y += 10;
    const subTotal = Number(inv.subTotal || 0);
    const taxTotal = Number((inv.tax?.cgst || 0) + (inv.tax?.sgst || 0) + (inv.tax?.igst || 0));
    const total = Number(inv.total || 0);
    const line = (label: string, val: number, bold = false) => {
      const fs = bold ? 12 : 11;
      doc.fontSize(fs).text(`${label} (Rs)`, 300, y, { width: 120 });
      doc.fontSize(fs).text(fmtVal(val), 430, y, { width: 110, align: 'right' });
      y += 16;
    };
    line('Sub Total', subTotal);
    if (inv.tax?.cgst) line('CGST', Number(inv.tax.cgst));
    if (inv.tax?.sgst) line('SGST', Number(inv.tax.sgst));
    if (inv.tax?.igst) line('IGST', Number(inv.tax.igst));
    line('Total', total, true);

    doc.end();
  } catch (e) {
    console.error('[INVOICE PDF] generation failed', e);
    if (!res.headersSent) res.status(500).json({ error: 'pdf_failed' });
  }
});

// Update payment for an invoice
async function updateInvoicePayment(req: AuthRequest, res: any) {
  const id = req.params.id;
  const { paidAmount } = req.body || {};
  const companyId = req.user.companyId || req.company?._id;
  const inv = await Invoice.findOne({ _id: id, companyId });
  if (!inv) return res.status(404).json({ error: 'not found' });
  const amt = Math.max(0, Math.min(Number(paidAmount || 0), Number(inv.total || 0)));
  inv.paidAmount = amt;
  const total = Number(inv.total || 0);
  inv.status = amt <= 0 ? 'unpaid' : (amt < total ? 'partial' : 'paid');
  await inv.save();
  return res.json(inv);
}

// Update payment for an invoice
router.patch('/:id/payment', authMiddleware, updateInvoicePayment as any);
// Also accept PUT for compatibility with some clients
router.put('/:id/payment', authMiddleware, updateInvoicePayment as any);

export default router;
