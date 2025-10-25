import express from 'express';
import { 
    logHealthCheck,
    getUserLogs,
    getEndpointLogs,
    getUsageStats,
    cleanOldLogs
} from '../controllers/logController';

// Middleware de autenticación y permisos
import { authGuard } from '../middleware/authGuard';
import { requirePermission } from '../middleware/permissionGuard';

const router = express.Router();

// Health check para el sistema de logs
router.get('/health', logHealthCheck);

// Obtener logs por usuario (requiere autenticación)
router.get('/user/:userId', authGuard, getUserLogs);

// Obtener logs por endpoint (requiere permiso de lectura)
router.get('/endpoint/:endpoint', authGuard, requirePermission('read:logs'), getEndpointLogs);

// Obtener estadísticas de uso (requiere permiso de lectura)
router.get('/stats', authGuard, requirePermission('read:logs'), getUsageStats);

// Limpiar logs antiguos (requiere permiso de administración)
router.delete('/clean', authGuard, requirePermission('admin:logs'), cleanOldLogs);

// Ruta por defecto del API de logs
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API de Logs de Endpoints - CarOnline Services',
    version: '1.0.0',
    endpoints: {
      health: 'GET /logs/health - Verificar estado del sistema de logs',
      userLogs: 'GET /logs/user/:userId - Obtener logs de un usuario específico',
      endpointLogs: 'GET /logs/endpoint/:endpoint - Obtener logs de un endpoint específico',
      stats: 'GET /logs/stats - Obtener estadísticas de uso',
      clean: 'DELETE /logs/clean - Limpiar logs antiguos'
    },
    permissions: {
      read: 'read:logs - Leer logs y estadísticas',
      admin: 'admin:logs - Administrar logs (limpiar)'
    },
    example: {
      userLogs: {
        method: 'GET',
        url: '/api/logs/user/64f1a2b3c4d5e6f7g8h9i0j1',
        query: '?limit=50'
      },
      endpointLogs: {
        method: 'GET',
        url: '/api/logs/endpoint/GET:/api/vehicles',
        query: '?limit=100'
      },
      stats: {
        method: 'GET',
        url: '/api/logs/stats',
        query: '?days=7'
      },
      clean: {
        method: 'DELETE',
        url: '/api/logs/clean',
        body: { daysToKeep: 30 }
      }
    }
  });
});

export default router;
