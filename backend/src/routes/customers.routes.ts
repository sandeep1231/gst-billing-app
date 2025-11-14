import { Router } from 'express';
import { Customer } from '../models/customer.model';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const { name, phone, gstin, address } = req.body;
  const userId = req.user._id;
  const companyId = req.user.companyId || req.company?._id;
  const c = await Customer.create({ userId, companyId, name, phone, gstin, address });
  res.json(c);
});

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  const { query, page = 1, limit = 20 } = req.query as any;
  const companyId = req.user.companyId || req.company?._id;
  const filter: any = { companyId };
  if (query) filter.name = { $regex: query, $options: 'i' };
  const data = await Customer.find(filter)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 });
  res.json(data);
});

router.patch('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const id = req.params.id;
  const companyId = req.user.companyId || req.company?._id;
  const doc = await Customer.findOneAndUpdate({ _id: id, companyId }, req.body, { new: true });
  if (!doc) return res.status(404).json({ error: 'not found' });
  res.json(doc);
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const id = req.params.id;
  const companyId = req.user.companyId || req.company?._id;
  const doc = await Customer.findOneAndDelete({ _id: id, companyId });
  if (!doc) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
});

export default router;
