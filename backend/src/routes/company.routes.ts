import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { Company } from '../models/company.model';
import { User } from '../models/user.model';

const router = Router();

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.company) {
    // Lazily create a company for this user if missing
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'unauthorized' });
    const name = user.shopName || 'My Company';
    const stateCode = user.stateCode;
    const company = await Company.create({ name, stateCode });
    await User.findByIdAndUpdate(user._id, { companyId: company._id });
    return res.json(company);
  }
  res.json(req.company);
});

router.put('/me', authMiddleware, async (req: AuthRequest, res) => {
  const { name, gstin, stateCode, address } = req.body || {};
  // Upsert company for this user
  let company = req.company;
  if (!company) {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'unauthorized' });
    company = await Company.create({ name: name || user.shopName || 'My Company', gstin, stateCode, address });
    await User.findByIdAndUpdate(user._id, { companyId: company._id });
    return res.json(company);
  }
  const doc = await Company.findByIdAndUpdate(company._id, { name, gstin, stateCode, address }, { new: true });
  res.json(doc);
});

export default router;
