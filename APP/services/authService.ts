import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../configs/config';
import JWTService from './jwtService';

// Definir el esquema para los usuarios
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  // Campos específicos para Google OAuth
  googleId: { type: String, sparse: true },
  googleProfile: {
    name: String,
    picture: String,
    locale: String
  },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' }
}, {
  timestamps: true
});

// Definir el esquema para los logs de sesión
const sessionLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, required: true },
  loginTime: { type: Date, default: Date.now },
  ipAddress: { type: String },
  userAgent: { type: String },
  status: { type: String, enum: ['success', 'failed'], default: 'success' },
  message: { type: String },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' }
}, {
  timestamps: true
});

// Crear los modelos
const User = mongoose.model('User', userSchema, 'users');
const SessionLog = mongoose.model('SessionLog', sessionLogSchema, 'sesion_logs');

// Interfaz para el tipo de usuario
interface UserType {
  _id?: string;
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  isActive: boolean;
  lastLogin?: Date;
  createdAt?: Date;
}

// Interfaz para el login
interface LoginCredentials {
  username: string;
  password: string;
}

// Interfaz para la respuesta de login
interface LoginResponse {
  success: boolean;
  message: string;
  user?: {
    _id: string;
    username: string;
    email: string;
    role: string;
  };
  token?: string;
}

class AuthService {
  private static instance: AuthService;
  private isConnected: boolean = false;
  private jwtService: JWTService;

  private constructor() {
    this.jwtService = JWTService.getInstance();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
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
    } catch (error) {
      console.error('Error al conectar a MongoDB:', error);
      throw error;
    }
  }

  // Validar credenciales de usuario
  public async validateUser(credentials: LoginCredentials, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
    try {
      const { username, password } = credentials;
       if (false) {
      const email = username.includes('@') ? username : `${username}@mock.local`;
      const mockUser = {
        _id: 'mock-' + Buffer.from(username).toString('hex').slice(0, 8),
        username: username.includes('@') ? username.split('@')[0] : username,
        email,
        role: 'user',
      };


      const token = this.jwtService.generateToken({
        userId: mockUser._id,
        username: mockUser.username,
        email: mockUser.email,
        role: mockUser.role,
        authProvider: 'local',
      });

      return {
        success: true,
        message: 'Login exitoso (MOCK)',
        user: mockUser,
        token,
      };
    }
      await this.connectToDatabase();
      

      // Buscar usuario por username o email
      const user = await User.findOne({
        $or: [
          { username: username },
          { email: username }
        ],
        isActive: true
      });

      if (!user) {
        // Guardar log de intento fallido
        await this.saveSessionLog({
          userId: 'unknown',
          username: username,
          email: username,
          role: 'unknown',
          status: 'failed',
          message: 'Usuario no encontrado o inactivo',
          ipAddress,
          userAgent,
          authProvider: 'local'
        });

        return {
          success: false,
          message: 'Usuario no encontrado o inactivo'
        };
      }

      // Verificar contraseña
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        // Guardar log de intento fallido
        await this.saveSessionLog({
          userId: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          status: 'failed',
          message: 'Contraseña incorrecta',
          ipAddress,
          userAgent,
          authProvider: 'local'
        });

        return {
          success: false,
          message: 'Contraseña incorrecta'
        };
      }

      // Actualizar último login
      await User.findByIdAndUpdate(user._id, {
        lastLogin: new Date()
      });

      // Guardar log de sesión exitosa
      await this.saveSessionLog({
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        status: 'success',
        message: 'Login exitoso',
        ipAddress,
        userAgent,
        authProvider: 'local'
      });

      // Generar token JWT
      const token = this.jwtService.generateToken({
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        authProvider: 'local'
      });

      // Retornar respuesta exitosa
      return {
        success: true,
        message: 'Login exitoso',
        user: {
          _id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role
        },
        token
      };

    } catch (error) {
      console.error('Error al validar usuario:', error);
      throw error;
    }
  }

  // Crear nuevo usuario
  public async createUser(userData: Omit<UserType, '_id' | 'createdAt'>): Promise<LoginResponse> {
    try {
      await this.connectToDatabase();
      
      const { username, email, password, role } = userData;

      // Verificar si el usuario ya existe
      const existingUser = await User.findOne({
        $or: [
          { username: username },
          { email: email }
        ]
      });

      if (existingUser) {
        return {
          success: false,
          message: 'El usuario o email ya existe'
        };
      }

      // Encriptar contraseña
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Crear nuevo usuario
      const newUser = new User({
        username,
        email,
        password: hashedPassword,
        role: role || 'user',
        isActive: true
      });

      await newUser.save();

      return {
        success: true,
        message: 'Usuario creado exitosamente',
        user: {
          _id: newUser._id.toString(),
          username: newUser.username,
          email: newUser.email,
          role: newUser.role
        }
      };

    } catch (error) {
      console.error('Error al crear usuario:', error);
      throw error;
    }
  }

  // Obtener usuario por ID
  public async getUserById(userId: string): Promise<UserType | null> {
    try {
      await this.connectToDatabase();
      
      const user = await User.findById(userId).select('-password');
      
      if (!user) {
        return null;
      }

      // Convertir el documento de Mongoose a la interfaz UserType
      return {
        _id: user._id.toString(),
        username: user.username,
        email: user.email,
        password: '', // No incluimos la contraseña por seguridad
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin || undefined,
        createdAt: user.createdAt || undefined
      };
    } catch (error) {
      console.error('Error al obtener usuario por ID:', error);
      throw error;
    }
  }

  // Verificar si un usuario existe
  public async userExists(username: string): Promise<boolean> {
    try {
      await this.connectToDatabase();
      
      const user = await User.findOne({
        $or: [
          { username: username },
          { email: username }
        ]
      });

      return !!user;
    } catch (error) {
      console.error('Error al verificar si existe el usuario:', error);
      throw error;
    }
  }

  // Guardar log de sesión
  public async saveSessionLog(userData: {
    userId: string;
    username: string;
    email: string;
    role: string;
    status: 'success' | 'failed';
    message?: string;
    ipAddress?: string;
    userAgent?: string;
    authProvider?: 'local' | 'google';
  }): Promise<void> {
    try {
      await this.connectToDatabase();
      
      // Verificar si ya existe un log reciente (últimos 5 segundos)
      const recentLog = await SessionLog.findOne({
        userId: userData.userId,
        email: userData.email,
        status: userData.status,
        loginTime: { $gte: new Date(Date.now() - 5000) } // Últimos 5 segundos
      });

      if (recentLog) {
        return;
      }
      
      const sessionLog = new SessionLog({
        userId: userData.userId,
        username: userData.username,
        email: userData.email,
        role: userData.role,
        loginTime: new Date(),
        ipAddress: userData.ipAddress,
        userAgent: userData.userAgent,
        status: userData.status,
        message: userData.message,
        authProvider: userData.authProvider || 'local'
      });

      await sessionLog.save();
    } catch (error) {
      console.error('Error al guardar log de sesión:', error);
      // No lanzamos error para no interrumpir el login
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

export default AuthService;
