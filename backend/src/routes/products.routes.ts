import { Router } from 'express';
import { Product } from '../models/product.model';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { Company } from '../models/company.model';
import { User } from '../models/user.model';

const router = Router();

// Ensure a company exists for the current user and return its id
async function ensureCompanyId(req: AuthRequest): Promise<string> {
  const user = req.user;
  if (!user) throw new Error('unauthorized');
  if (user.companyId) return String(user.companyId);
  // Lazily create a company similar to /company/me behavior
  const name = (user as any).shopName || 'My Company';
  const stateCode = (user as any).stateCode;
  const company = await Company.create({ name, stateCode });
  await User.findByIdAndUpdate(user._id, { companyId: company._id });
  // attach to request for downstream use
  (req as any).company = company;
  (req as any).user.companyId = company._id;
  return String(company._id);
}

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const { name, price, gstPercent, unit, hsn, openingQty } = req.body;
  const userId = req.user._id;
  const companyId = (req.user.companyId || req.company?._id) ? (req.user.companyId || req.company?._id) : await ensureCompanyId(req);
  try {
    const p = await Product.create({ userId, companyId, name, price, gstPercent, unit, hsn, openingQty });
    console.log('[PRODUCTS] Created product', { companyId, userId, productId: p._id, name });
    res.json(p);
  } catch (err) {
    console.error('[PRODUCTS] Create error', err);
    res.status(500).json({ error: 'create_failed' });
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  const { query, page = 1, limit = 20 } = req.query as any;
  const companyId = (req.user.companyId || req.company?._id) ? (req.user.companyId || req.company?._id) : await ensureCompanyId(req);
  const filter: any = { companyId };
  if (query) filter.name = { $regex: query, $options: 'i' };
  try {
    const data = await Product.find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });
    if (data.length === 0) {
      const totalForCompany = await Product.countDocuments({ companyId });
      console.log('[PRODUCTS] List EMPTY', { companyId, query: query || '', totalForCompany });
    } else {
      console.log('[PRODUCTS] List', { companyId, query: query || '', returned: data.length });
    }
    res.json(data);
  } catch (err) {
    console.error('[PRODUCTS] List error', err);
    res.status(500).json({ error: 'list_failed' });
  }
});

const updateHandler = async (req: AuthRequest, res: any) => {
  const id = req.params.id;
  const companyId = (req.user.companyId || req.company?._id) ? (req.user.companyId || req.company?._id) : await ensureCompanyId(req);
  try {
    const doc = await Product.findOneAndUpdate({ _id: id, companyId }, req.body, { new: true });
    if (!doc) {
      console.warn('[PRODUCTS] Update not found', { companyId, id });
      return res.status(404).json({ error: 'not found' });
    }
    console.log('[PRODUCTS] Updated product', { companyId, id });
    res.json(doc);
  } catch (err) {
    console.error('[PRODUCTS] Update error', err);
    res.status(500).json({ error: 'update_failed' });
  }
};

router.patch('/:id', authMiddleware, updateHandler);
router.put('/:id', authMiddleware, updateHandler);

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const id = req.params.id;
  const companyId = req.user.companyId || req.company?._id;
  const doc = await Product.findOneAndDelete({ _id: id, companyId });
  if (!doc) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
});

export default router;
