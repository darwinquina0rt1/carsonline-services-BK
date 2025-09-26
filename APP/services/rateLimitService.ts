import mongoose from 'mongoose';
import { config } from '../configs/config';

// Esquema para login attempts
const loginAttemptSchema = new mongoose.Schema({
  identifier: { type: String, required: true, index: true },
  type: { type: String, enum: ['ip', 'email', 'combined'], required: true },
  count: { type: Number, default: 0 },
  lastAttempt: { type: Date, default: Date.now },
  firstAttempt: { type: Date, default: Date.now },
  isBlocked: { type: Boolean, default: false },
  blockUntil: { type: Date },
  successCount: { type: Number, default: 0 },
  lastSuccess: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const LoginAttempt = mongoose.model('LoginAttempt', loginAttemptSchema, 'login_attempts');

class RateLimitService {
  private static instance: RateLimitService;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }

  // Conectar a la base de datos
  private async connectToDatabase(): Promise<void> {
    if (this.isConnected) return;

    try {
      const configData = config();
      const mongoUri = configData.database.uri;
      const dbName = configData.database.name;
      
      if (!mongoUri) {
        throw new Error('MONGO_URI no está definida en las variables de entorno');
      }

      const fullUri = mongoUri.endsWith('/') 
        ? `${mongoUri}${dbName}` 
        : `${mongoUri}/${dbName}`;

      await mongoose.connect(fullUri);
      this.isConnected = true;
      console.log(`RateLimitService conectado a MongoDB - Base de datos: ${dbName}`);
    } catch (error) {
      console.error('Error al conectar RateLimitService a MongoDB:', error);
      throw error;
    }
  }

  public async checkRateLimit(identifier: string, type: 'ip' | 'email' | 'combined' = 'ip'): Promise<{
    allowed: boolean;
    waitTime?: number;
    message?: string;
  }> {
    try {
      await this.connectToDatabase();
      
      const now = new Date();
      
      // Buscar intento existente
      let attempt = await LoginAttempt.findOne({ identifier, type });
      
      if (!attempt) {
        // Primer intento - crear registro
        attempt = new LoginAttempt({
          identifier,
          type,
          count: 1,
          lastAttempt: now,
          firstAttempt: now
        });
        await attempt.save();
        return { allowed: true };
      }
      
      // Verificar si está bloqueado
      if (attempt.isBlocked && attempt.blockUntil && now < attempt.blockUntil) {
        const waitTime = attempt.blockUntil.getTime() - now.getTime();
        return {
          allowed: false,
          waitTime,
          message: `Bloqueado. Espera ${Math.ceil(waitTime / 1000)} segundos`
        };
      }
      
      // Calcular tiempo de espera con exponential backoff
      const waitTime = 1000 * Math.pow(2, attempt.count - 1);
      const timeSinceLastAttempt = now.getTime() - attempt.lastAttempt.getTime();
      
      if (timeSinceLastAttempt < waitTime) {
        return {
          allowed: false,
          waitTime: waitTime - timeSinceLastAttempt,
          message: `Espera ${Math.ceil((waitTime - timeSinceLastAttempt) / 1000)} segundos`
        };
      }
      
      // Permitir intento - actualizar contador
      attempt.count += 1;
      attempt.lastAttempt = now;
      attempt.updatedAt = now;
      
      // Bloquear si excede límite (5 intentos)
      if (attempt.count >= 5) {
        attempt.isBlocked = true;
        attempt.blockUntil = new Date(now.getTime() + waitTime);
      }
      
      await attempt.save();
      return { allowed: true };
      
    } catch (error) {
      console.error('Error en checkRateLimit:', error);
      // En caso de error, permitir el intento para no bloquear usuarios legítimos
      return { allowed: true };
    }
  }
  
  public async resetAttempts(identifier: string, type: 'ip' | 'email' | 'combined' = 'ip'): Promise<void> {
    try {
      await this.connectToDatabase();
      
      await LoginAttempt.findOneAndUpdate(
        { identifier, type },
        { 
          count: 0, 
          isBlocked: false, 
          blockUntil: null,
          $inc: { successCount: 1 },
          lastSuccess: new Date(),
          updatedAt: new Date()
        }
      );
    } catch (error) {
      console.error('Error en resetAttempts:', error);
    }
  }
  
  public async getAttemptStats(identifier: string, type: 'ip' | 'email' | 'combined' = 'ip'): Promise<any> {
    try {
      await this.connectToDatabase();
      return await LoginAttempt.findOne({ identifier, type });
    } catch (error) {
      console.error('Error en getAttemptStats:', error);
      return null;
    }
  }
  
  public async cleanupOldAttempts(daysOld: number = 7): Promise<void> {
    try {
      await this.connectToDatabase();
      const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
      await LoginAttempt.deleteMany({ 
        lastAttempt: { $lt: cutoffDate },
        successCount: { $gt: 0 }
      });
      console.log(`Limpieza de intentos antiguos completada`);
    } catch (error) {
      console.error('Error en cleanupOldAttempts:', error);
    }
  }
}

export default RateLimitService;
