import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../configs/config';

interface TokenPayload {
  userId: string;
  username: string;
  email: string;
  role: string;
  authProvider: 'local' | 'google' | 'local+duo';
  mfa?: boolean;
}

class JWTService {
  private static instance: JWTService;
  private jwtSecret: string;
  private jwtExpiresIn: string;

  private constructor() {
    const cfg = config();
    this.jwtSecret = cfg.jwt.secret;
    this.jwtExpiresIn = cfg.jwt.expiresIn;
  }

  public static getInstance(): JWTService {
    if (!JWTService.instance) JWTService.instance = new JWTService();
    return JWTService.instance;
  }

  public generateToken(payload: TokenPayload): string {
    return (jwt as any).sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn } as SignOptions);
  }

  public verifyToken(token: string): TokenPayload {
    return (jwt as any).verify(token, this.jwtSecret) as TokenPayload;
  }

  public decodeToken(token: string): TokenPayload | null {
    try { return (jwt as any).decode(token) as TokenPayload; } catch { return null; }
  }
}

export type { TokenPayload };
export default JWTService;
