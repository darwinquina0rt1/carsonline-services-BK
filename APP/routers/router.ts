import express from 'express';
import { 
    getVehiclesGroupedByBrand,
    getVehiclesByBrand,
    getAvailableBrands,
    getVehicleStatsByBrand,
    healthCheck
} from '../controllers/controller';

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
      stats: 'GET /stats - Obtener estadísticas de vehículos por marca'
    },
    example: {
      getAllVehicles: '/api/vehicles',
      getVehiclesByBrand: '/api/vehicles/brand/Toyota',
      getBrands: '/api/brands',
      getStats: '/api/stats'
    }
  });
});

export default router;
