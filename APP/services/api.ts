import mongoose from 'mongoose';
import { config } from '../configs/config';

// Reutilizar el modelo existente de services.ts
const Vehicle = mongoose.model('Car');

// Interfaz para el tipo de vehículo
interface VehicleType {
  id: number;
  marca: string;
  modelo: string;
  año: string;
  precio: string;
  estado: string;
  kilometraje: string;
  color: string;
  image: string;
  status?: string; // Campo opcional para soft delete
}

// Interfaz para crear/actualizar vehículo
interface CreateVehicleData {
  marca: string;
  modelo: string;
  año: string;
  precio: string;
  estado: string;
  kilometraje: string;
  color: string;
  image: string;
}

// Interfaz para actualizar vehículo (todos los campos opcionales excepto id)
interface UpdateVehicleData {
  marca?: string;
  modelo?: string;
  año?: string;
  precio?: string;
  estado?: string;
  kilometraje?: string;
  color?: string;
  image?: string;
}

class VehicleApiService {
  private static instance: VehicleApiService;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): VehicleApiService {
    if (!VehicleApiService.instance) {
      VehicleApiService.instance = new VehicleApiService();
    }
    return VehicleApiService.instance;
  }

  // Conectar a la base de datos
  private async connectToDatabase(): Promise<void> {
    if (this.isConnected) return;

    try {
      const configData = config();
      const mongoUri = configData.database.uri;
      const dbName = configData.database.name;
      
      if (!mongoUri) {
        throw new Error('MONGO_URI no está definida en las variables de entorno');
      }

      // Construir la URI completa con el nombre de la base de datos
      const fullUri = mongoUri.endsWith('/') 
        ? `${mongoUri}${dbName}` 
        : `${mongoUri}/${dbName}`;

      await mongoose.connect(fullUri);
      this.isConnected = true;
      console.log(`Servicio API conectado a MongoDB - Base de datos: ${dbName}`);
    } catch (error) {
      console.error('Error al conectar a MongoDB:', error);
      throw error;
    }
  }

  // Generar ID único para nuevo vehículo
  private async generateUniqueId(): Promise<number> {
    try {
      const lastVehicle = await Vehicle.findOne({}, {}, { sort: { id: -1 } });
      return lastVehicle ? lastVehicle.id + 1 : 1;
    } catch (error) {
      console.error('Error al generar ID único:', error);
      throw error;
    }
  }

  // 1. AGREGAR VEHÍCULO
  public async addVehicle(vehicleData: CreateVehicleData): Promise<VehicleType> {
    try {
      await this.connectToDatabase();
      
      // Generar ID único
      const newId = await this.generateUniqueId();
      
      // Crear nuevo vehículo
      const newVehicle = new Vehicle({
        id: newId,
        ...vehicleData
      });

      const savedVehicle = await newVehicle.save();
      
      return {
        id: savedVehicle.id,
        marca: savedVehicle.marca,
        modelo: savedVehicle.modelo,
        año: savedVehicle.año,
        precio: savedVehicle.precio,
        estado: savedVehicle.estado,
        kilometraje: savedVehicle.kilometraje,
        color: savedVehicle.color,
        image: savedVehicle.image,
        status: savedVehicle.status
      };
    } catch (error) {
      console.error('Error al agregar vehículo:', error);
      throw error;
    }
  }

  // 2. EDITAR VEHÍCULO
  public async updateVehicle(id: number, updateData: UpdateVehicleData): Promise<VehicleType | null> {
    try {
      await this.connectToDatabase();
      
      // Verificar que el vehículo existe
      const existingVehicle = await Vehicle.findOne({ id });
      if (!existingVehicle) {
        return null;
      }

      // Actualizar vehículo
      const updatedVehicle = await Vehicle.findOneAndUpdate(
        { id },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedVehicle) {
        return null;
      }

      return {
        id: updatedVehicle.id,
        marca: updatedVehicle.marca,
        modelo: updatedVehicle.modelo,
        año: updatedVehicle.año,
        precio: updatedVehicle.precio,
        estado: updatedVehicle.estado,
        kilometraje: updatedVehicle.kilometraje,
        color: updatedVehicle.color,
        image: updatedVehicle.image,
        status: updatedVehicle.status
      };
    } catch (error) {
      console.error(`Error al actualizar vehículo con ID ${id}:`, error);
      throw error;
    }
  }

  // 3. ELIMINAR VEHÍCULO (Soft Delete)
  public async deleteVehicle(id: number): Promise<VehicleType | null> {
    try {
      await this.connectToDatabase();
      
      // Verificar que el vehículo existe
      const existingVehicle = await Vehicle.findOne({ id });
      if (!existingVehicle) {
        return null;
      }

      // Soft delete: actualizar el status a "DELETED"
      const updatedVehicle = await Vehicle.findOneAndUpdate(
        { id },
        { $set: { status: "DELETED" } },
        { new: true, runValidators: true }
      );

      if (!updatedVehicle) {
        return null;
      }

      return {
        id: updatedVehicle.id,
        marca: updatedVehicle.marca,
        modelo: updatedVehicle.modelo,
        año: updatedVehicle.año,
        precio: updatedVehicle.precio,
        estado: updatedVehicle.estado,
        kilometraje: updatedVehicle.kilometraje,
        color: updatedVehicle.color,
        image: updatedVehicle.image,
        status: updatedVehicle.status
      };
    } catch (error) {
      console.error(`Error al eliminar vehículo con ID ${id}:`, error);
      throw error;
    }
  }

  // Cerrar conexión
  public async closeConnection(): Promise<void> {
    if (this.isConnected) {
      await mongoose.connection.close();
      this.isConnected = false;
      console.log('Conexión a MongoDB cerrada desde VehicleApiService');
    }
  }
}

export default VehicleApiService;
export { VehicleType, CreateVehicleData, UpdateVehicleData };
