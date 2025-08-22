import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../configs/config';

// Interfaz para el payload del token
interface TokenPayload {
  userId: string;
  username: string;
  email: string;
  role: string;
  authProvider: 'local' | 'google';
}

class JWTService {
  private static instance: JWTService;
  private jwtSecret: string;
  private jwtExpiresIn: string;

  private constructor() {
    const configData = config();
    this.jwtSecret = configData.jwt.secret;
    this.jwtExpiresIn = configData.jwt.expiresIn;
  }

  public static getInstance(): JWTService {
    if (!JWTService.instance) {
      JWTService.instance = new JWTService();
    }
    return JWTService.instance;
  }

  // Generar token JWT
  public generateToken(payload: TokenPayload): string {
    return (jwt as any).sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
  }

  // Verificar token JWT
  public verifyToken(token: string): TokenPayload {
    try {
      const decoded = (jwt as any).verify(token, this.jwtSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      throw new Error('Token inválido o expirado');
    }
  }

  // Decodificar token sin verificar (solo para obtener información)
  public decodeToken(token: string): TokenPayload | null {
    try {
      const decoded = (jwt as any).decode(token) as TokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }
}

export default JWTService;
