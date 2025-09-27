import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { requireAdmin } from '../middleware/permissionGuard';
import { 
  getUserPermissions, 
  getAllPermissions, 
  checkPermission, 
  permissionHealthCheck,
  getUserPermissionsNoMFA
} from '../controllers/permissionController';

const router = Router();

// Health check (público)
router.get('/health', permissionHealthCheck);

// Obtener permisos del usuario actual (requiere autenticación)
router.get('/user', authGuard, getUserPermissions);

// Obtener permisos SIN verificar MFA (para testing)
router.get('/user-no-mfa', getUserPermissionsNoMFA);

// Verificar permiso específico (requiere autenticación)
router.get('/check/:permission', authGuard, checkPermission);

// Obtener todos los permisos (solo admin)
router.get('/all', authGuard, requireAdmin, getAllPermissions);

export default router;
