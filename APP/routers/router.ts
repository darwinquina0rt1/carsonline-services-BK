import express from 'express';
import { 
    getVehiclesGroupedByBrand,
    getVehiclesByBrand,
    getAvailableBrands,
    getVehicleStatsByBrand,
    healthCheck
} from '../controllers/controller';

// servicios y controalddores para crear eliminar y editar
import {
    createVehicle,
    updateVehicle,
    deleteVehicle,
    crudHealthCheck
} from '../controllers/crudcars';

// Middleware de autenticación y permisos
import { authGuard } from '../middleware/authGuard';
import { requirePermission } from '../middleware/permissionGuard';

const router = express.Router();

// Health check endpoint
router.get('/health', healthCheck);

// Obtener todos los vehículos agrupados por marca
router.get('/vehicles', getVehiclesGroupedByBrand);

// Obtener vehículos por marca específica
router.get('/vehicles/brand/:marca', getVehiclesByBrand);

// Obtener todas las marcas disponibles
router.get('/brands', getAvailableBrands);

// Obtener estadísticas de vehículos por marca
router.get('/stats', getVehicleStatsByBrand);

// ===== RUTAS CRUD PARA VEHÍCULOS =====
// Crear vehículo (requiere permiso create:vehicle)
router.post('/vehicles', authGuard, requirePermission('create:vehicle'), createVehicle);

// Editar vehículo (requiere permiso update:vehicle)
router.put('/vehicles/:id', authGuard, requirePermission('update:vehicle'), updateVehicle);

// Eliminar vehículo (requiere permiso delete:vehicle)
router.delete('/vehicles/:id', authGuard, requirePermission('delete:vehicle'), deleteVehicle);

// Health check para módulo CRUD
router.get('/vehicles/health', crudHealthCheck);

// Ruta por defecto del API
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API de Vehículos - CarOnline Services',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health - Verificar estado del API',
      vehicles: 'GET /vehicles - Obtener todos los vehículos agrupados por marca',
      vehiclesByBrand: 'GET /vehicles/brand/:marca - Obtener vehículos por marca específica',
      brands: 'GET /brands - Obtener todas las marcas disponibles',
      stats: 'GET /stats - Obtener estadísticas de vehículos por marca',
      // CRUD Endpoints
      createVehicle: 'POST /vehicles - Crear nuevo vehículo',
      updateVehicle: 'PUT /vehicles/:id - Actualizar vehículo',
      deleteVehicle: 'DELETE /vehicles/:id - Eliminar vehículo',
      crudHealth: 'GET /vehicles/health - Health check del módulo CRUD'
    },
    example: {
      getAllVehicles: '/api/vehicles',
      getVehiclesByBrand: '/api/vehicles/brand/Toyota',
      getBrands: '/api/brands',
      getStats: '/api/stats',
      // CRUD Examples
      createVehicle: '/api/vehicles',
      updateVehicle: '/api/vehicles/1',
      deleteVehicle: '/api/vehicles/1',
      crudHealth: '/api/vehicles/health'
    }
  });
});

export default router;

//los routers se usan para crear direcciones que usara el frontend
