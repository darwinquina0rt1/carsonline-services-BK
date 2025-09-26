import { Request, Response, NextFunction } from 'express';
import JWTService from '../services/jwtService';

export function authGuard(req: Request, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization;
  if (!hdr || !hdr.startsWith('Bearer ')) {
    return res.status(401).json({ success:false, message:'no_token' });
  }
  const token = hdr.slice(7);
  try {
    const jwt = JWTService.getInstance();
    const dec = jwt.verifyToken(token) as any;
    if (!dec?.mfa) {
      return res.status(403).json({ success:false, message:'mfa_required' });
    }
    (req as any).user = dec;
    next();
  } catch (e: any) {
    const msg = e?.name === 'TokenExpiredError' ? 'jwt_expired' : 'jwt_invalid';
    return res.status(401).json({ success:false, message: msg });
  }
}
