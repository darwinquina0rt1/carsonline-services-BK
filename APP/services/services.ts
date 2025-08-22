import mongoose from 'mongoose';
import { config } from '../configs/config';

// Definir el esquema para los vehículos
const vehicleSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  marca: { type: String, required: true },
  modelo: { type: String, required: true },
  año: { type: String, required: true },
  precio: { type: String, required: true },
  estado: { type: String, required: true },
  kilometraje: { type: String, required: true },
  color: { type: String, required: true },
  image: { type: String, required: true }
}, {
  timestamps: true
});

// Crear el modelo
const Vehicle = mongoose.model('Car', vehicleSchema, 'cars');

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
}

// Interfaz para el resultado agrupado por marca
interface GroupedVehicles {
  [marca: string]: VehicleType[];
}

class VehicleService {
  private static instance: VehicleService;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): VehicleService {
    if (!VehicleService.instance) {
      VehicleService.instance = new VehicleService();
    }
    return VehicleService.instance;
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
      console.log(`Servicio conectado a MongoDB - Base de datos: ${dbName}`);
    } catch (error) {
      console.error('Error al conectar a MongoDB:', error);
      throw error;
    }
  }

  // Obtener todos los vehículos agrupados por marca
  public async getVehiclesGroupedByBrand(): Promise<GroupedVehicles> {
    try {
      await this.connectToDatabase();
      
      const vehicles = await Vehicle.find({}).sort({ marca: 1, modelo: 1 });
      
      // Agrupar vehículos por marca
      const groupedVehicles: GroupedVehicles = {};
      
      vehicles.forEach((vehicle) => {
        const marca = vehicle.marca;
        if (!groupedVehicles[marca]) {
          groupedVehicles[marca] = [];
        }
        
        groupedVehicles[marca].push({
          id: vehicle.id,
          marca: vehicle.marca,
          modelo: vehicle.modelo,
          año: vehicle.año,
          precio: vehicle.precio,
          estado: vehicle.estado,
          kilometraje: vehicle.kilometraje,
          color: vehicle.color,
          image: vehicle.image
        });
      });

      return groupedVehicles;
    } catch (error) {
      console.error('Error al obtener vehículos agrupados por marca:', error);
      throw error;
    }
  }

  // Obtener vehículos por marca específica
  public async getVehiclesByBrand(marca: string): Promise<VehicleType[]> {
    try {
      await this.connectToDatabase();
      
      const vehicles = await Vehicle.find({ marca: { $regex: marca, $options: 'i' } })
        .sort({ modelo: 1 });
      
      return vehicles.map(vehicle => ({
        id: vehicle.id,
        marca: vehicle.marca,
        modelo: vehicle.modelo,
        año: vehicle.año,
        precio: vehicle.precio,
        estado: vehicle.estado,
        kilometraje: vehicle.kilometraje,
        color: vehicle.color,
        image: vehicle.image
      }));
    } catch (error) {
      console.error(`Error al obtener vehículos de la marca ${marca}:`, error);
      throw error;
    }
  }

  // Obtener todas las marcas disponibles
  public async getAvailableBrands(): Promise<string[]> {
    try {
      await this.connectToDatabase();
      
      const brands = await Vehicle.distinct('marca');
      return brands.sort();
    } catch (error) {
      console.error('Error al obtener marcas disponibles:', error);
      throw error;
    }
  }

  // Obtener estadísticas de vehículos por marca
  public async getVehicleStatsByBrand(): Promise<{ [marca: string]: { total: number; disponibles: number; vendidos: number; mantenimiento: number } }> {
    try {
      await this.connectToDatabase();
      
      const vehicles = await Vehicle.find({});
      const stats: { [marca: string]: { total: number; disponibles: number; vendidos: number; mantenimiento: number } } = {};
      
      vehicles.forEach((vehicle) => {
        const marca = vehicle.marca;
        if (!stats[marca]) {
          stats[marca] = { total: 0, disponibles: 0, vendidos: 0, mantenimiento: 0 };
        }
        
        stats[marca].total++;
        
        switch (vehicle.estado.toLowerCase()) {
          case 'disponible':
            stats[marca].disponibles++;
            break;
          case 'vendido':
            stats[marca].vendidos++;
            break;
          case 'en mantenimiento':
            stats[marca].mantenimiento++;
            break;
        }
      });


      //respuesta que retocna está función
      return stats;
    } catch (error) {
      console.error('Error al obtener estadísticas por marca:', error);
      throw error;
    }
  }

  // Cerrar conexión
  public async closeConnection(): Promise<void> {
    if (this.isConnected) {
      await mongoose.connection.close();
      this.isConnected = false;
      console.log('Conexión a MongoDB cerrada');
    }
  }
}

export default VehicleService;
