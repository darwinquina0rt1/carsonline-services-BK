import { Request, Response, NextFunction } from 'express';
import JWTService from '../services/jwtService';

// Extender la interfaz Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        email: string;
        role: string;
        authProvider: string;
        mfa?: boolean;
      };
    }
  }
}

export function authGuard(req: Request, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization;
  if (!hdr || !hdr.startsWith('Bearer ')) {
    return res.status(401).json({ success:false, message:'no_token' });
  }
  const token = hdr.slice(7);
  try {
    const jwt = JWTService.getInstance();
    const dec = jwt.verifyToken(token) as any;
    
    
    // Verificar MFA - puede ser true (boolean) o "true" (string)
    if (dec?.mfa !== true && dec?.mfa !== "true") {
      return res.status(403).json({ success:false, message:'mfa_required' });
    }
    
    
    // Asignar información del usuario al request
    req.user = {
      userId: dec.userId,
      username: dec.username,
      email: dec.email,
      role: dec.role,
      authProvider: dec.authProvider,
      mfa: dec.mfa
    };
    next();
  } catch (e: any) {
    const msg = e?.name === 'TokenExpiredError' ? 'jwt_expired' : 'jwt_invalid';
    return res.status(401).json({ success:false, message: msg });
  }
}
