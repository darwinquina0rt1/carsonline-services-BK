import { Request, Response } from 'express';
import VehicleService from '../services/services';

const vehicleService = VehicleService.getInstance();

// Obtener todos los vehículos agrupados por marca
export const getVehiclesGroupedByBrand = async (req: Request, res: Response): Promise<void> => {
  try {
    
    const groupedVehicles = await vehicleService.getVehiclesGroupedByBrand();
    
    res.status(200).json({
      success: true,
      message: 'Vehículos obtenidos exitosamente',
      data: groupedVehicles,
      totalBrands: Object.keys(groupedVehicles).length,
      totalVehicles: Object.values(groupedVehicles).reduce((acc, vehicles) => acc + vehicles.length, 0)
    });
  } catch (error) {
    console.error('Error en el controlador - getVehiclesGroupedByBrand:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Obtener vehículos por marca específica
export const getVehiclesByBrand = async (req: Request, res: Response): Promise<void> => {
  try {
    const { marca } = req.params;
    
    if (!marca) {
      res.status(400).json({
        success: false,
        message: 'El parámetro marca es requerido'
      });
      return;
    }

    
    const vehicles = await vehicleService.getVehiclesByBrand(marca);
    
    res.status(200).json({
      success: true,
      message: `Vehículos de ${marca} obtenidos exitosamente`,
      data: {
        marca: marca,
        vehicles: vehicles,
        total: vehicles.length
      }
    });
  } catch (error) {
    console.error('Error en el controlador - getVehiclesByBrand:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Muestra todas las marcas existentes
export const getAvailableBrands = async (req: Request, res: Response): Promise<void> => {
  try {
    
    const brands = await vehicleService.getAvailableBrands();
    
    res.status(200).json({
      success: true,
      message: 'Marcas obtenidas exitosamente',
      data: brands,
      total: brands.length
    });
    //Actualiza la gestión de errores
  } catch (error) {
    console.error('Error en el controlador - getAvailableBrands:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Muestra estadísticas por marca de vehículo
export const getVehicleStatsByBrand = async (req: Request, res: Response): Promise<void> => {
  try {
    
    const stats = await vehicleService.getVehicleStatsByBrand();
    
    res.status(200).json({
      success: true,
      message: 'Estadísticas obtenidas exitosamente',
      data: stats,
      totalBrands: Object.keys(stats).length
    });
  } catch (error) {
    console.error('Error en el controlador - getVehicleStatsByBrand:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Endpoint de prueba/health check
export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      message: 'API de vehículos funcionando correctamente',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Error en el controlador - healthCheck:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};


//este archivo maneja la lógica del proyecto, va conectado con los servicios en services