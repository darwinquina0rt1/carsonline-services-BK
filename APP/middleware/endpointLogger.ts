import { Request, Response, NextFunction } from 'express';
import EndpointLogService from '../services/endpointLogService';

// Extender la interfaz Request para incluir información de timing
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
      sessionId?: string;
    }
  }
}

export function endpointLogger(req: Request, res: Response, next: NextFunction) {
  // Capturar tiempo de inicio
  req.startTime = Date.now();
  
  // Generar sessionId único si no existe
  if (!req.sessionId) {
    req.sessionId = generateSessionId();
  }

  // Capturar información de la request
  const originalSend = res.send;
  const originalJson = res.json;
  
  let responseBody: any = null;
  let responseSize = 0;

  // Interceptar la respuesta para capturar el body y tamaño
  res.send = function(body: any) {
    responseBody = body;
    responseSize = typeof body === 'string' ? Buffer.byteLength(body, 'utf8') : JSON.stringify(body).length;
    return originalSend.call(this, body);
  };

  res.json = function(body: any) {
    responseBody = body;
    responseSize = typeof body === 'string' ? Buffer.byteLength(body, 'utf8') : JSON.stringify(body).length;
    return originalJson.call(this, body);
  };

  // Capturar cuando termine la respuesta
  res.on('finish', async () => {
    try {
      const endTime = Date.now();
      const responseTime = endTime - (req.startTime || endTime);
      
      // Extraer información del usuario si está autenticado
      const userInfo = req.user ? {
        userId: req.user.userId,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        authProvider: req.user.authProvider,
        isAuthenticated: true
      } : {
        isAuthenticated: false
      };

      // Extraer información de la request
      const requestInfo = {
        method: req.method,
        url: req.originalUrl || req.url,
        endpoint: extractEndpoint(req.originalUrl || req.url),
        ip: getClientIP(req),
        userAgent: req.get('User-Agent') || null,
        referer: req.get('Referer') || null,
        queryParams: sanitizeObject(req.query),
        routeParams: sanitizeObject(req.params),
        hasBody: req.method !== 'GET' && req.method !== 'HEAD',
        bodySize: getBodySize(req),
        sessionId: req.sessionId
      };

      // Información de la response
      const responseInfo = {
        statusCode: res.statusCode,
        responseTime,
        isError: res.statusCode >= 400
      };

      // Crear el log
      const logData = {
        ...requestInfo,
        ...userInfo,
        ...responseInfo,
        timestamp: new Date(),
        errorMessage: res.statusCode >= 400 ? getErrorMessage(responseBody) : null
      };

      // Guardar el log de forma asíncrona (no bloquea la respuesta)
      setImmediate(async () => {
        try {
          const logService = EndpointLogService.getInstance();
          await logService.createLog(logData);
        } catch (error) {
          console.error('Error al guardar log de endpoint:', error);
        }
      });

    } catch (error) {
      console.error('Error en middleware de logging:', error);
    }
  });

  next();
}

// Función para generar un sessionId único
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Función para extraer el endpoint base (sin parámetros)
function extractEndpoint(url: string): string {
  // Remover query parameters
  const withoutQuery = url.split('?')[0];
  
  // Remover parámetros de ruta (reemplazar IDs con :id)
  const endpoint = withoutQuery
    .replace(/\/\d+/g, '/:id') // Reemplazar números con :id
    .replace(/\/[a-f0-9]{24}/g, '/:id') // Reemplazar ObjectIds con :id
    .replace(/\/[a-f0-9-]{36}/g, '/:id'); // Reemplazar UUIDs con :id
  
  return endpoint;
}

// Función para obtener la IP real del cliente
function getClientIP(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
         (req.headers['x-real-ip'] as string) ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         (req.connection as any)?.socket?.remoteAddress ||
         'unknown';
}

// Función para obtener el tamaño del body de la request
function getBodySize(req: Request): number {
  if (!req.body) return 0;
  
  try {
    return Buffer.byteLength(JSON.stringify(req.body), 'utf8');
  } catch {
    return 0;
  }
}

// Función para sanitizar objetos (remover datos sensibles)
function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

// Función para extraer mensaje de error de la respuesta
function getErrorMessage(responseBody: any): string | null {
  if (!responseBody) return null;
  
  try {
    if (typeof responseBody === 'string') {
      const parsed = JSON.parse(responseBody);
      return parsed.message || parsed.error || null;
    }
    
    if (typeof responseBody === 'object') {
      return responseBody.message || responseBody.error || null;
    }
  } catch {
    // Si no se puede parsear, devolver null
  }
  
  return null;
}

export default endpointLogger;
