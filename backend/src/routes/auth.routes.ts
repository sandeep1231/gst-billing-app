import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';

const router = Router();

router.post('/register', async (req, res) => {
  const { email, password, shopName, stateCode, gstin, address } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email/password required' });
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ error: 'email exists' });
  const hash = await bcrypt.hash(password, 10);
  // Create a company for this user (basic info from shopName/stateCode/gstin)
  const { Company } = await import('../models/company.model');
  const company = await Company.create({ name: shopName || 'My Company', gstin, stateCode, address });
  const user = await User.create({ email, passwordHash: hash, shopName, stateCode, companyId: company._id });
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'dev');
  res.json({ token });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.warn('[AUTH] login user not found', { email });
      return res.status(401).json({ error: 'invalid' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      console.warn('[AUTH] login password mismatch', { email });
      return res.status(401).json({ error: 'invalid' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'dev');
    console.log('[AUTH] login success', { email, userId: user._id });
    res.json({ token });
  } catch (err) {
    console.error('[AUTH] login error', err);
    res.status(500).json({ error: 'login_failed' });
  }
});

export default router;
