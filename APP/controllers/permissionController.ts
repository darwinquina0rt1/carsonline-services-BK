import { Request, Response } from 'express';
import PermissionService from '../services/permissionService';
import JWTService from '../services/jwtService';

const permissionService = PermissionService.getInstance();

// Obtener permisos del usuario actual
export const getUserPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    const userPermissions = await permissionService.getUserPermissions(req.user.role);
    
    res.status(200).json({
      success: true,
      message: 'Permisos del usuario obtenidos exitosamente',
      data: userPermissions
    });
  } catch (error) {
    console.error('Error en getUserPermissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Obtener todos los permisos (solo admin)
export const getAllPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Se requieren permisos de administrador'
      });
      return;
    }

    const allPermissions = await permissionService.getAllPermissions();
    
    res.status(200).json({
      success: true,
      message: 'Todos los permisos obtenidos exitosamente',
      data: allPermissions
    });
  } catch (error) {
    console.error('Error en getAllPermissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Verificar si el usuario tiene un permiso específico
export const checkPermission = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    const { permission } = req.params;
    
    if (!permission) {
      res.status(400).json({
        success: false,
        message: 'Parámetro permission es requerido'
      });
      return;
    }

    const hasPermission = await permissionService.hasPermission(req.user.role, permission);
    
    res.status(200).json({
      success: true,
      message: hasPermission ? 'Usuario tiene el permiso' : 'Usuario no tiene el permiso',
      data: {
        permission,
        hasPermission,
        userRole: req.user.role
      }
    });
  } catch (error) {
    console.error('Error en checkPermission:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Obtener permisos del usuario SIN verificar MFA (para testing)
export const getUserPermissionsNoMFA = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No token provided'
      });
      return;
    }

    const token = authHeader.slice(7);
    const jwt = JWTService.getInstance();
    
    try {
      // Decodificar token sin verificar expiración
      const decoded = jwt.decodeToken(token);
      
      if (!decoded) {
        res.status(401).json({
          success: false,
          message: 'Token inválido'
        });
        return;
      }

      const userPermissions = await permissionService.getUserPermissions(decoded.role);
      
      res.status(200).json({
        success: true,
        message: 'Permisos del usuario obtenidos exitosamente (sin verificar MFA)',
        data: {
          ...userPermissions,
          tokenInfo: {
            userId: decoded.userId,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role,
            authProvider: decoded.authProvider,
            mfa: decoded.mfa,
            note: 'Token decodificado sin verificar expiración'
          }
        }
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: 'Error al decodificar token',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Error en getUserPermissionsNoMFA:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Health check para permisos
export const permissionHealthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      message: 'API de Permisos funcionando correctamente',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      endpoints: {
        getUserPermissions: 'GET /permissions/user - Obtener permisos del usuario actual',
        getUserPermissionsNoMFA: 'GET /permissions/user-no-mfa - Obtener permisos sin verificar MFA',
        getAllPermissions: 'GET /permissions/all - Obtener todos los permisos (admin)',
        checkPermission: 'GET /permissions/check/:permission - Verificar permiso específico',
        health: 'GET /permissions/health - Health check'
      }
    });
  } catch (error) {
    console.error('Error en permissionHealthCheck:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
