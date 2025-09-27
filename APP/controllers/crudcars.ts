import { Request, Response } from 'express';
import VehicleApiService, { CreateVehicleData, UpdateVehicleData } from '../services/api';

const vehicleApiService = VehicleApiService.getInstance();

// 1. CREAR VEHÍCULO
export const createVehicle = async (req: Request, res: Response): Promise<void> => {
  try {
    
    // Validar que se envíen todos los campos requeridos
    const { marca, modelo, año, precio, estado, kilometraje, color, image } = req.body;
    
    if (!marca || !modelo || !año || !precio || !estado || !kilometraje || !color || !image) {
      res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos: marca, modelo, año, precio, estado, kilometraje, color, image'
      });
      return;
    }

    // Crear objeto con los datos del vehículo
    const vehicleData: CreateVehicleData = {
      marca: marca.trim(),
      modelo: modelo.trim(),
      año: año.trim(),
      precio: precio.trim(),
      estado: estado.trim(),
      kilometraje: kilometraje.trim(),
      color: color.trim(),
      image: image.trim()
    };

    // Llamar al servicio para crear el vehículo
    const newVehicle = await vehicleApiService.addVehicle(vehicleData);
    
    res.status(201).json({
      success: true,
      message: 'Vehículo creado exitosamente',
      data: newVehicle
    });
  } catch (error) {
    console.error('Error en el controlador - createVehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al crear vehículo',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// 2. EDITAR VEHÍCULO
export const updateVehicle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Validar que el ID sea un número
    const vehicleId = parseInt(id);
    if (isNaN(vehicleId)) {
      res.status(400).json({
        success: false,
        message: 'El ID debe ser un número válido'
      });
      return;
    }

    // Validar que se envíe al menos un campo para actualizar
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: 'Debe enviar al menos un campo para actualizar'
      });
      return;
    }

    // Limpiar y validar los datos de actualización
    const cleanUpdateData: UpdateVehicleData = {};
    
    if (updateData.marca) cleanUpdateData.marca = updateData.marca.trim();
    if (updateData.modelo) cleanUpdateData.modelo = updateData.modelo.trim();
    if (updateData.año) cleanUpdateData.año = updateData.año.trim();
    if (updateData.precio) cleanUpdateData.precio = updateData.precio.trim();
    if (updateData.estado) cleanUpdateData.estado = updateData.estado.trim();
    if (updateData.kilometraje) cleanUpdateData.kilometraje = updateData.kilometraje.trim();
    if (updateData.color) cleanUpdateData.color = updateData.color.trim();
    if (updateData.image) cleanUpdateData.image = updateData.image.trim();

    
    // Llamar al servicio para actualizar el vehículo
    const updatedVehicle = await vehicleApiService.updateVehicle(vehicleId, cleanUpdateData);
    
    if (!updatedVehicle) {
      res.status(404).json({
        success: false,
        message: `Vehículo con ID ${vehicleId} no encontrado`
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Vehículo actualizado exitosamente',
      data: updatedVehicle
    });
  } catch (error) {
    console.error('Error en el controlador - updateVehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al actualizar vehículo',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// 3. ELIMINAR VEHÍCULO
export const deleteVehicle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Validar que el ID sea un número
    const vehicleId = parseInt(id);
    if (isNaN(vehicleId)) {
      res.status(400).json({
        success: false,
        message: 'El ID debe ser un número válido'
      });
      return;
    }

    
    // Llamar al servicio para eliminar el vehículo (soft delete)
    const deletedVehicle = await vehicleApiService.deleteVehicle(vehicleId);
    
    if (!deletedVehicle) {
      res.status(404).json({
        success: false,
        message: `Vehículo con ID ${vehicleId} no encontrado`
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Vehículo eliminado exitosamente (soft delete)',
      data: deletedVehicle
    });
  } catch (error) {
    console.error('Error en el controlador - deleteVehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al eliminar vehículo',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// 4. HEALTH CHECK para el módulo CRUD
export const crudHealthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      message: 'Módulo CRUD de vehículos funcionando correctamente',
      timestamp: new Date().toISOString(),
      endpoints: {
        create: 'POST /api/vehicles - Crear vehículo',
        update: 'PUT /api/vehicles/:id - Actualizar vehículo',
        delete: 'DELETE /api/vehicles/:id - Eliminar vehículo'
      }
    });
  } catch (error) {
    console.error('Error en el controlador - crudHealthCheck:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
