import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export function hashPassword(plain: string, methodHash: string): string {
  switch (methodHash) {
    case 'MD5':
      return crypto.createHash('md5').update(plain).digest('hex');
    case 'SHA256':
      return crypto.createHash('sha256').update(plain).digest('hex');
    case 'BCRYPT':
      return bcrypt.hashSync(plain, 10);
    case 'NONE':
    default:
      return plain;
  }
}

export function verifyPassword(plain: string, stored: string | null, methodHash: string): boolean {
  if (!stored) return false;
  
  switch (methodHash) {
    case 'MD5':
      return hashPassword(plain, 'MD5') === stored;
    case 'SHA256':
      return hashPassword(plain, 'SHA256') === stored;
    case 'BCRYPT':
      return bcrypt.compareSync(plain, stored);
    case 'NONE':
    default:
      return plain === stored; 
  }
}