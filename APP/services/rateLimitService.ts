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

const SessionLogSchema = new mongoose.Schema({
  userId: String,
  username: String,
  email: String,
  role: String,
  status: String,
  message: String,
  ipAddress: String,
  userAgent: String,
  latencyMs: Number,
  createdAt: { type: Date, default: Date.now },
});

const SessionLog =
  mongoose.models.SessionLog || mongoose.model("SessionLog", SessionLogSchema);

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
    } catch (error) {
      console.error('Error al conectar RateLimitService a MongoDB:', error);
      throw error;
    }
  }

public async checkRateLimit(identifier: string, type: 'ip' | 'email' | 'combined' = 'ip'): Promise<{
  allowed: boolean;
  message?: string;
  score?: number;
}> {
  try {
    await this.connectToDatabase();
    const now = new Date();
    const start = new Date(now.getTime() - 60_000); // 1 minuto

    const logs = await SessionLog.find({
      ipAddress: identifier,
      createdAt: { $gte: start, $lt: now },
    });

    if (!logs.length) return { allowed: true };

    const reqPerMin = logs.length;
    const fails = logs.filter(l => l.status === "failed").length;
    const failRatio = fails / reqPerMin;
    const uniqueUsers = new Set(logs.map(l => l.username)).size;
    const avgLatency =
      logs.reduce((sum, l) => sum + (l.latencyMs || 0), 0) / reqPerMin;

    const metrics = { reqPerMin, failRatio, uniqueUsers, avgLatency };

    const res = await fetch("http://127.0.0.1:5050/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metrics),
    });

    const result = await res.json();
    const isAnomaly = result.isAnomaly === true;
    const score = result.score ?? 0;

    let attempt = await LoginAttempt.findOne({ identifier, type });

    if (!attempt) {
      attempt = new LoginAttempt({
        identifier,
        type,
        count: 1,
        lastAttempt: now,
        firstAttempt: now,
        successCount: 0,
        isBlocked: isAnomaly,
        blockUntil: isAnomaly ? new Date(now.getTime() + 5 * 60_000) : null, // bloquea 5 min si anómalo
      });
    } else {
      // 🔹 Actualizar datos existentes
      attempt.count += 1;
      attempt.lastAttempt = now;

      if (isAnomaly) {
        attempt.isBlocked = true;
        attempt.blockUntil = new Date(now.getTime() + 5 * 60_000);
      } else {
        if (attempt.isBlocked && attempt.blockUntil && now > attempt.blockUntil) {
          attempt.isBlocked = false;
          attempt.blockUntil = null;
        }
      }
    }

    attempt.updatedAt = now;
    await attempt.save();

    // 🔹 Respuesta final
    if (isAnomaly) {
      return {
        allowed: false,
        score,
        message: `Comportamiento anómalo detectado (score: ${score.toFixed(3)})`,
      };
    }

    return {
      allowed: true,
      score,
      message: `Login dentro del comportamiento normal (score: ${score.toFixed(3)})`,
    };
  } catch (error: any) {
    console.error("Error en checkRateLimit con ML:", error.message);
    return { allowed: true, message: "Error al conectar con modelo ML" };
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
    } catch (error) {
      console.error('Error en cleanupOldAttempts:', error);
    }
  }
   public async GenerateReport( ): Promise<any> {
  
       try {
              await this.connectToDatabase();

    const minutes = Number( 120);
    const end = new Date();
    const start = new Date(end.getTime() - minutes * 60_000);

    const aggCounts = await SessionLog.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const counts = { success: 0, failed: 0 };
    aggCounts.forEach(g => { counts[g._id] = g.count; });

    const topIPs = await LoginAttempt.aggregate([
      {
        $group: {
          _id: '$identifier',
          totalAttempts: { $sum: '$count' },
          lastAttempt: { $max: '$lastAttempt' },
          isBlocked: { $max: { $cond: ['$isBlocked', 1, 0] } },
          lastBlockUntil: { $max: '$blockUntil' },
          totalSuccess: { $sum: '$successCount' }
        }
      },
      {
        $project: {
          ip: '$_id',
          totalAttempts: 1,
          successRate: {
            $cond: [
              { $eq: ['$totalAttempts', 0] },
              0,
              { $divide: ['$totalSuccess', '$totalAttempts'] }
            ]
          },
          isBlocked: 1,
          lastAttempt: 1,
          lastBlockUntil: 1
        }
      },
      { $sort: { totalAttempts: -1 } },
      { $limit: 10 }
    ]);

    const totalIPs = await LoginAttempt.countDocuments();
    const blockedIPs = await LoginAttempt.countDocuments({ isBlocked: true });

    return {
      windowMinutes: minutes,
      totalIPs,
      blockedIPs,
      counts,
      topSuspicious: topIPs
    };
  } catch (err) {
    console.error('Error /api/ml/dashboard:', err);
  }
      
     
  }
}

export default RateLimitService;
