import { Request, Response, NextFunction } from 'express';
import PermissionService from '../services/permissionService';

// Extender la interfaz Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        email: string;
        role: string;
        authProvider: string;
        mfa?: boolean;
      };
    }
  }
}

/**
 * Middleware para verificar permisos específicos
 * @param requiredPermission - Permiso requerido (ej: 'create:vehicle', 'update:vehicle')
 */
export function requirePermission(requiredPermission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verificar que el usuario esté autenticado
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const permissionService = PermissionService.getInstance();
      const hasPermission = await permissionService.hasPermission(
        req.user.role, 
        requiredPermission
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `No tienes permisos para realizar esta acción. Se requiere: ${requiredPermission}`,
          requiredPermission,
          userRole: req.user.role
        });
      }

      next();
    } catch (error) {
      console.error('Error en permissionGuard:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };
}

/**
 * Middleware para verificar múltiples permisos (OR)
 * @param permissions - Array de permisos, el usuario debe tener al menos uno
 */
export function requireAnyPermission(permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const permissionService = PermissionService.getInstance();
      
      // Verificar si tiene al menos uno de los permisos
      for (const permission of permissions) {
        const hasPermission = await permissionService.hasPermission(
          req.user.role, 
          permission
        );
        if (hasPermission) {
          return next();
        }
      }

      return res.status(403).json({
        success: false,
        message: `No tienes permisos para realizar esta acción. Se requiere uno de: ${permissions.join(', ')}`,
        requiredPermissions: permissions,
        userRole: req.user.role
      });
    } catch (error) {
      console.error('Error en requireAnyPermission:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };
}

/**
 * Middleware para verificar que el usuario sea admin
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuario no autenticado'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Se requieren permisos de administrador',
      userRole: req.user.role
    });
  }

  next();
}
