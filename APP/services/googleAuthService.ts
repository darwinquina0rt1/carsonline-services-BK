import { OAuth2Client } from 'google-auth-library';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../configs/config';
import JWTService from './jwtService';

// Obtener los modelos existentes
const User = mongoose.model('User');
const SessionLog = mongoose.model('SessionLog');

// Interfaz para el perfil de Google
interface GoogleProfile {
  sub: string;           // Google ID
  name: string;          // Nombre completo
  given_name: string;    // Nombre
  family_name: string;   // Apellido
  picture: string;       // URL de la foto de perfil
  email: string;         // Email
  email_verified: boolean; // Si el email está verificado
  locale: string;        // Idioma/región
}

// Interfaz para los datos del perfil enviados desde el frontend
interface GoogleProfileData {
  googleId: string;
  email: string;
  name: string;
  givenName: string;
  familyName: string;
  picture: string;
  accessToken: string;
}

// Interfaz para la respuesta de autenticación
interface AuthResponse {
  success: boolean;
  message: string;
  user?: {
    _id: string;
    username: string;
    email: string;
    role: string;
    googleProfile?: {
      name: string;
      picture: string;
      locale: string;
    };
  };
  token?: string;
  isNewUser?: boolean;
}

class GoogleAuthService {
  private static instance: GoogleAuthService;
  private isConnected: boolean = false;
  private googleClient: OAuth2Client;
  private jwtService: JWTService;

  private constructor() {
    const configData = config();
    this.googleClient = new OAuth2Client(
      configData.google.clientId,
      configData.google.clientSecret,
      configData.google.redirectUri
    );
    this.jwtService = JWTService.getInstance();
  }

  public static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
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
      console.log(`GoogleAuthService conectado a MongoDB - Base de datos: ${dbName}`);
    } catch (error) {
      console.error('Error al conectar a MongoDB:', error);
      throw error;
    }
  }

  // Verificar access token de Google
  public async verifyGoogleAccessToken(accessToken: string): Promise<GoogleProfile> {
    try {
      // Para access tokens, podemos hacer una petición a la API de Google
      const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
      
      if (!response.ok) {
        throw new Error('Access token de Google inválido');
      }

      const userInfo = await response.json() as any;

      return {
        sub: userInfo.id,
        name: userInfo.name || '',
        given_name: userInfo.given_name || '',
        family_name: userInfo.family_name || '',
        picture: userInfo.picture || '',
        email: userInfo.email || '',
        email_verified: userInfo.verified_email || false,
        locale: userInfo.locale || 'es'
      };
    } catch (error) {
      console.error('Error al verificar access token de Google:', error);
      throw new Error('Access token de Google inválido o expirado');
    }
  }

  // Verificar token de Google (método original con idToken)
  public async verifyGoogleToken(idToken: string): Promise<GoogleProfile> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: idToken,
        audience: config().google.clientId
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Token de Google inválido');
      }

      return {
        sub: payload.sub,
        name: payload.name || '',
        given_name: payload.given_name || '',
        family_name: payload.family_name || '',
        picture: payload.picture || '',
        email: payload.email || '',
        email_verified: payload.email_verified || false,
        locale: payload.locale || 'es'
      };
    } catch (error) {
      console.error('Error al verificar token de Google:', error);
      throw new Error('Token de Google inválido o expirado');
    }
  }

  // Autenticar o crear usuario con datos del perfil de Google
  public async authenticateWithGoogleProfile(
    profileData: GoogleProfileData, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<AuthResponse> {
    try {
      await this.connectToDatabase();

      // Buscar usuario existente por Google ID o email
      let user = await User.findOne({
        $or: [
          { googleId: profileData.googleId },
          { email: profileData.email }
        ]
      });

      let isNewUser = false;

      if (!user) {
        // Crear nuevo usuario con Google
        isNewUser = true;
        
        // Generar username único basado en el email
        const baseUsername = profileData.email.split('@')[0];
        let username = baseUsername;
        let counter = 1;
        
        // Verificar que el username sea único
        while (await User.findOne({ username })) {
          username = `${baseUsername}${counter}`;
          counter++;
        }

        // Crear contraseña aleatoria (no se usará pero es requerida por el esquema)
        const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);

        user = new User({
          username,
          email: profileData.email,
          password: randomPassword, // Contraseña aleatoria ya que usará Google
          role: 'user',
          isActive: true,
          googleId: profileData.googleId,
          googleProfile: {
            name: profileData.name,
            picture: profileData.picture,
            locale: 'es'
          },
          authProvider: 'google'
        });

        await user.save();
        console.log(`Nuevo usuario creado con Google: ${user.email}`);
      } else {
        // Usuario existente - actualizar información de Google si es necesario
        if (!user.googleId) {
          user.googleId = profileData.googleId;
          user.authProvider = 'google';
          user.googleProfile = {
            name: profileData.name,
            picture: profileData.picture,
            locale: 'es'
          };
          await user.save();
        }
      }

      // Actualizar último login
      await User.findByIdAndUpdate(user._id, {
        lastLogin: new Date()
      });

      // Generar token JWT
      const token = this.jwtService.generateToken({
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        authProvider: 'google'
      });

      // Guardar log de sesión exitosa
      await this.saveSessionLog({
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        status: 'success',
        message: 'Login exitoso con Google',
        ipAddress,
        userAgent,
        authProvider: 'google'
      });

      return {
        success: true,
        message: isNewUser ? 'Usuario creado y autenticado exitosamente con Google' : 'Login exitoso con Google',
        user: {
          _id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          googleProfile: user.googleProfile ? {
            name: user.googleProfile.name || '',
            picture: user.googleProfile.picture || '',
            locale: user.googleProfile.locale || ''
          } : undefined
        },
        token,
        isNewUser
      };

    } catch (error) {
      console.error('Error en autenticación con Google:', error);
      
      // Guardar log de intento fallido
      if (error instanceof Error) {
        await this.saveSessionLog({
          userId: 'unknown',
          username: 'google_user',
          email: 'unknown@google.com',
          role: 'unknown',
          status: 'failed',
          message: error.message,
          ipAddress,
          userAgent,
          authProvider: 'google'
        });
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error en autenticación con Google'
      };
    }
  }

  // Autenticar o crear usuario con Google (método original con idToken)
  public async authenticateWithGoogle(
    idToken: string, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<AuthResponse> {
    try {
      await this.connectToDatabase();

      // Verificar el token de Google
      const googleProfile = await this.verifyGoogleToken(idToken);

      // Buscar usuario existente por Google ID o email
      let user = await User.findOne({
        $or: [
          { googleId: googleProfile.sub },
          { email: googleProfile.email }
        ]
      });

      let isNewUser = false;

      if (!user) {
        // Crear nuevo usuario con Google
        isNewUser = true;
        
        // Generar username único basado en el email
        const baseUsername = googleProfile.email.split('@')[0];
        let username = baseUsername;
        let counter = 1;
        
        // Verificar que el username sea único
        while (await User.findOne({ username })) {
          username = `${baseUsername}${counter}`;
          counter++;
        }

        // Crear contraseña aleatoria (no se usará pero es requerida por el esquema)
        const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);

        user = new User({
          username,
          email: googleProfile.email,
          password: randomPassword, // Contraseña aleatoria ya que usará Google
          role: 'user',
          isActive: true,
          googleId: googleProfile.sub,
          googleProfile: {
            name: googleProfile.name,
            picture: googleProfile.picture,
            locale: googleProfile.locale
          },
          authProvider: 'google'
        });

        await user.save();
        console.log(`Nuevo usuario creado con Google: ${user.email}`);
      } else {
        // Usuario existente - actualizar información de Google si es necesario
        if (!user.googleId) {
          user.googleId = googleProfile.sub;
          user.authProvider = 'google';
          user.googleProfile = {
            name: googleProfile.name,
            picture: googleProfile.picture,
            locale: googleProfile.locale
          };
          await user.save();
        }
      }

      // Actualizar último login
      await User.findByIdAndUpdate(user._id, {
        lastLogin: new Date()
      });

            // Generar token JWT
      const token = this.jwtService.generateToken({
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        authProvider: 'google'
      });

      // Guardar log de sesión exitosa
      await this.saveSessionLog({
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        status: 'success',
        message: 'Login exitoso con Google',
        ipAddress,
        userAgent,
        authProvider: 'google'
      });

      return {
        success: true,
        message: isNewUser ? 'Usuario creado y autenticado exitosamente con Google' : 'Login exitoso con Google',
        user: {
          _id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          googleProfile: user.googleProfile ? {
            name: user.googleProfile.name || '',
            picture: user.googleProfile.picture || '',
            locale: user.googleProfile.locale || ''
          } : undefined
        },
        token,
        isNewUser
      };

    } catch (error) {
      console.error('Error en autenticación con Google:', error);
      
      // Guardar log de intento fallido
      if (error instanceof Error) {
        await this.saveSessionLog({
          userId: 'unknown',
          username: 'google_user',
          email: 'unknown@google.com',
          role: 'unknown',
          status: 'failed',
          message: error.message,
          ipAddress,
          userAgent,
          authProvider: 'google'
        });
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error en autenticación con Google'
      };
    }
  }

  // Guardar log de sesión
  private async saveSessionLog(userData: {
    userId: string;
    username: string;
    email: string;
    role: string;
    status: 'success' | 'failed';
    message?: string;
    ipAddress?: string;
    userAgent?: string;
    authProvider: 'local' | 'google';
  }): Promise<void> {
    try {
      await this.connectToDatabase();
      
      // Verificar si ya existe un log reciente (últimos 5 segundos)
      const recentLog = await SessionLog.findOne({
        userId: userData.userId,
        email: userData.email,
        status: userData.status,
        authProvider: userData.authProvider,
        loginTime: { $gte: new Date(Date.now() - 5000) }
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
        authProvider: userData.authProvider
      });

      await sessionLog.save();
    } catch (error) {
      console.error('Error al guardar log de sesión:', error);
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

export default GoogleAuthService;
