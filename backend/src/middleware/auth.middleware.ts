import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { Company } from '../models/company.model';

export interface AuthRequest extends Request {
  user?: any;
  company?: any;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'no token' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'invalid token' });
  const token = parts[1];
  try {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET || 'dev');
    const user = await User.findById(payload.userId).select('-passwordHash');
    if (!user) return res.status(401).json({ error: 'invalid' });
    req.user = user;
    if (user.companyId) {
      const company = await Company.findById(user.companyId);
      if (company) req.company = company;
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid' });
  }
};
