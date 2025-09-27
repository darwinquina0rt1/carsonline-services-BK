import { Request, Response } from 'express';
import EndpointLogService from '../services/endpointLogService';

// Health check para el sistema de logs
export async function logHealthCheck(req: Request, res: Response) {
  try {
    const logService = EndpointLogService.getInstance();
    
    res.json({
      success: true,
      message: 'Sistema de logging funcionando correctamente',
      timestamp: new Date().toISOString(),
      service: 'Endpoint Log Service'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error en el sistema de logging',
      error: error.message
    });
  }
}

// Obtener logs por usuario (requiere autenticación)
export async function getUserLogs(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario requerido'
      });
    }

    const logService = EndpointLogService.getInstance();
    const logs = await logService.getLogsByUser(userId, limit);
    
    res.json({
      success: true,
      data: logs,
      count: logs.length,
      userId
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener logs del usuario',
      error: error.message
    });
  }
}

// Obtener logs por endpoint
export async function getEndpointLogs(req: Request, res: Response) {
  try {
    const { endpoint } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    
    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Endpoint requerido'
      });
    }

    const logService = EndpointLogService.getInstance();
    const logs = await logService.getLogsByEndpoint(endpoint, limit);
    
    res.json({
      success: true,
      data: logs,
      count: logs.length,
      endpoint
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener logs del endpoint',
      error: error.message
    });
  }
}

// Obtener estadísticas de uso
export async function getUsageStats(req: Request, res: Response) {
  try {
    const days = parseInt(req.query.days as string) || 7;
    
    const logService = EndpointLogService.getInstance();
    const stats = await logService.getUsageStats(days);
    
    res.json({
      success: true,
      data: stats,
      period: `${days} días`,
      generatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de uso',
      error: error.message
    });
  }
}

// Limpiar logs antiguos (solo para administradores)
export async function cleanOldLogs(req: Request, res: Response) {
  try {
    const daysToKeep = parseInt(req.body.daysToKeep as string) || 30;
    
    if (daysToKeep < 7) {
      return res.status(400).json({
        success: false,
        message: 'No se pueden eliminar logs de menos de 7 días'
      });
    }

    const logService = EndpointLogService.getInstance();
    const deletedCount = await logService.cleanOldLogs(daysToKeep);
    
    res.json({
      success: true,
      message: `Se eliminaron ${deletedCount} logs antiguos`,
      deletedCount,
      daysToKeep
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error al limpiar logs antiguos',
      error: error.message
    });
  }
}
