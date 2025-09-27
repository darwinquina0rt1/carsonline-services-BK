import mongoose from 'mongoose';
import { config } from '../configs/config';

// Definir el esquema para los logs de endpoints
const endpointLogSchema = new mongoose.Schema({
  // Información del endpoint
  method: { type: String, required: true },
  url: { type: String, required: true },
  endpoint: { type: String, required: true }, // Ruta base sin parámetros
  
  // Información del usuario (opcional si no está autenticado)
  userId: { type: String, default: null },
  username: { type: String, default: null },
  email: { type: String, default: null },
  role: { type: String, default: null },
  authProvider: { type: String, default: null },
  
  // Información de la request
  ip: { type: String, required: true },
  userAgent: { type: String, default: null },
  referer: { type: String, default: null },
  
  // Información de la response
  statusCode: { type: Number, required: true },
  responseTime: { type: Number, required: true }, // en milisegundos
  
  // Parámetros y datos
  queryParams: { type: Object, default: {} },
  routeParams: { type: Object, default: {} },
  hasBody: { type: Boolean, default: false },
  bodySize: { type: Number, default: 0 }, // tamaño del body en bytes
  
  // Metadatos
  timestamp: { type: Date, default: Date.now },
  sessionId: { type: String, default: null },
  
  // Información adicional
  isAuthenticated: { type: Boolean, default: false },
  isError: { type: Boolean, default: false },
  errorMessage: { type: String, default: null }
}, {
  timestamps: true
});

// Crear índices para optimizar consultas
endpointLogSchema.index({ userId: 1, timestamp: -1 });
endpointLogSchema.index({ endpoint: 1, timestamp: -1 });
endpointLogSchema.index({ method: 1, timestamp: -1 });
endpointLogSchema.index({ statusCode: 1, timestamp: -1 });

// Crear el modelo
const EndpointLog = mongoose.model('EndpointLog', endpointLogSchema, 'endpoint_logs');

// Interfaz para el tipo de log
interface EndpointLogType {
  method: string;
  url: string;
  endpoint: string;
  userId?: string;
  username?: string;
  email?: string;
  role?: string;
  authProvider?: string;
  ip: string;
  userAgent?: string;
  referer?: string;
  statusCode: number;
  responseTime: number;
  queryParams?: object;
  routeParams?: object;
  hasBody: boolean;
  bodySize: number;
  timestamp: Date;
  sessionId?: string;
  isAuthenticated: boolean;
  isError: boolean;
  errorMessage?: string;
}

class EndpointLogService {
  private static instance: EndpointLogService;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): EndpointLogService {
    if (!EndpointLogService.instance) {
      EndpointLogService.instance = new EndpointLogService();
    }
    return EndpointLogService.instance;
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

      // Construir la URI completa con el nombre de la base de datos
      const fullUri = mongoUri.endsWith('/') 
        ? `${mongoUri}${dbName}` 
        : `${mongoUri}/${dbName}`;

      await mongoose.connect(fullUri);
      this.isConnected = true;
    } catch (error) {
      console.error('Error al conectar a MongoDB para logging:', error);
      throw error;
    }
  }

  // Crear un nuevo log de endpoint
  public async createLog(logData: Partial<EndpointLogType>): Promise<void> {
    try {
      await this.connectToDatabase();
      
      const log = new EndpointLog(logData);
      await log.save();
    } catch (error) {
      console.error('Error al crear log de endpoint:', error);
      // No lanzamos el error para no afectar la funcionalidad principal
    }
  }

  // Obtener logs por usuario
  public async getLogsByUser(userId: string, limit: number = 100): Promise<EndpointLogType[]> {
    try {
      await this.connectToDatabase();
      
      const logs = await EndpointLog.find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit);
      
      return logs;
    } catch (error) {
      console.error('Error al obtener logs por usuario:', error);
      throw error;
    }
  }

  // Obtener logs por endpoint
  public async getLogsByEndpoint(endpoint: string, limit: number = 100): Promise<EndpointLogType[]> {
    try {
      await this.connectToDatabase();
      
      const logs = await EndpointLog.find({ endpoint })
        .sort({ timestamp: -1 })
        .limit(limit);
      
      return logs;
    } catch (error) {
      console.error('Error al obtener logs por endpoint:', error);
      throw error;
    }
  }

  // Obtener estadísticas de uso
  public async getUsageStats(days: number = 7): Promise<any> {
    try {
      await this.connectToDatabase();
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const stats = await EndpointLog.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              endpoint: '$endpoint',
              method: '$method'
            },
            count: { $sum: 1 },
            avgResponseTime: { $avg: '$responseTime' },
            uniqueUsers: { $addToSet: '$userId' }
          }
        },
        {
          $project: {
            endpoint: '$_id.endpoint',
            method: '$_id.method',
            count: 1,
            avgResponseTime: { $round: ['$avgResponseTime', 2] },
            uniqueUsersCount: { $size: '$uniqueUsers' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);
      
      return stats;
    } catch (error) {
      console.error('Error al obtener estadísticas de uso:', error);
      throw error;
    }
  }

  // Limpiar logs antiguos (más de X días)
  public async cleanOldLogs(daysToKeep: number = 30): Promise<number> {
    try {
      await this.connectToDatabase();
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const result = await EndpointLog.deleteMany({
        timestamp: { $lt: cutoffDate }
      });
      
      return result.deletedCount;
    } catch (error) {
      console.error('Error al limpiar logs antiguos:', error);
      throw error;
    }
  }

  // Cerrar conexión
  public async closeConnection(): Promise<void> {
    if (this.isConnected) {
      await mongoose.connection.close();
      this.isConnected = false;
    }
  }
}

export default EndpointLogService;
