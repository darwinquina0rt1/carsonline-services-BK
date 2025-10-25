import mongoose from 'mongoose';
import { config } from '../configs/config';

// Esquema para permisos
const permissionSchema = new mongoose.Schema({
  role: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  permissions: [{ type: String, required: true }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const Permission = mongoose.model('Permission', permissionSchema, 'permissions');

interface PermissionData {
  _id?: string;
  role: string;
  description: string;
  permissions: string[];
}

class PermissionService {
  private static instance: PermissionService;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
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

      const fullUri = mongoUri.endsWith('/') 
        ? `${mongoUri}${dbName}` 
        : `${mongoUri}/${dbName}`;

      await mongoose.connect(fullUri);
      this.isConnected = true;
    } catch (error) {
      console.error('Error al conectar a MongoDB:', error);
      throw error;
    }
  }

  // Obtener permisos por rol
  public async getPermissionsByRole(role: string): Promise<string[]> {
    try {
      await this.connectToDatabase();
      
      const permission = await Permission.findOne({ role });
      
      if (!permission) {
        return []; // Sin permisos si no existe el rol
      }

      return permission.permissions;
    } catch (error) {
      console.error('Error al obtener permisos por rol:', error);
      return [];
    }
  }

  // Verificar si un usuario tiene un permiso específico
  public async hasPermission(role: string, permission: string): Promise<boolean> {
    try {
      const permissions = await this.getPermissionsByRole(role);
      return permissions.includes(permission);
    } catch (error) {
      console.error('Error al verificar permiso:', error);
      return false;
    }
  }

  // Obtener todos los permisos disponibles
  public async getAllPermissions(): Promise<PermissionData[]> {
    try {
      await this.connectToDatabase();
      
      const permissions = await Permission.find({});
      
      return permissions.map(permission => ({
        _id: permission._id.toString(),
        role: permission.role,
        description: permission.description,
        permissions: permission.permissions
      }));
    } catch (error) {
      console.error('Error al obtener todos los permisos:', error);
      return [];
    }
  }

  // Obtener permisos del usuario desde el JWT
  public async getUserPermissions(userRole: string): Promise<{
    role: string;
    permissions: string[];
    canCreate: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canPublish: boolean;
  }> {
    try {
      const permissions = await this.getPermissionsByRole(userRole);
      
      return {
        role: userRole,
        permissions,
        canCreate: permissions.includes('create:vehicle'),
        canRead: permissions.includes('read:vehicle'),
        canUpdate: permissions.includes('update:vehicle'),
        canDelete: permissions.includes('delete:vehicle'),
        canPublish: permissions.includes('publish:vehicle')
      };
    } catch (error) {
      console.error('Error al obtener permisos del usuario:', error);
      return {
        role: userRole,
        permissions: [],
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDelete: false,
        canPublish: false
      };
    }
  }

  // Cerrar conexión
  public async closeConnection(): Promise<void> {
    if (this.isConnected) {
      await mongoose.connection.close();
      this.isConnected = false;
    }
  }
}

export default PermissionService;
