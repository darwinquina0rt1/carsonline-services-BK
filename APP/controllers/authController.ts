import { Request, Response } from 'express';
import AuthService from '../services/authService';
import RateLimitService from '../services/rateLimitService';
import { getDuoClient } from '../src/utils/duoClient';
import { savePending } from '../src/utils/pendingLogins';
import { duoConfig } from '../configs/duo';
import { getClientIP } from '../src/utils/ipUtils';

import { takePending } from '../src/utils/pendingLogins';
import JWTService from '../services/jwtService';

const authService = AuthService.getInstance();
const rateLimitService = RateLimitService.getInstance();

// Interfaz para la petición de login
interface LoginRequest {
  email: string;
  password: string;
  mfa:string;
}

// Interfaz para la petición de registro
interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
}

// Login de usuario
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password,mfa }: LoginRequest = req.body;

    // Validar que se proporcionen los campos requeridos
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email y password son requeridos'
      });
      return;
    }

    // Obtener IP y User-Agent
    const ipAddress = getClientIP(req);
    const userAgent = req.get('User-Agent') || 'unknown';

    // Verificar rate limiting con exponential backoff
    const rateLimitResult = await rateLimitService.checkRateLimit(ipAddress, 'ip');
    
    if (!rateLimitResult.allowed) {
      res.status(429).json({
        success: false,
        message: rateLimitResult.message,
        waitTime: rateLimitResult.waitTime
      });
      return;
    }

    // Comprobar autenticidad de usuario y contraseña
    const result = await authService.validateUser({ username: email, password }, ipAddress, userAgent);

    if (result.success) {
      // Reset rate limiting en login exitoso
      await rateLimitService.resetAttempts(ipAddress, 'ip');

      if(mfa=="S"){
        // Verificar si Duo está configurado
        if (!process.env.DUO_CLIENT_ID || !process.env.DUO_CLIENT_SECRET || !process.env.DUO_API_HOST) {
          
          // Generar JWT con MFA simulado para desarrollo
          const jwt = JWTService.getInstance();
          const token = jwt.generateToken({
            userId: result.user._id,
            username: result.user.username,
            email: result.user.email,
            role: result.user.role,
            authProvider: 'local+duo',  // Cambiar a local+duo para indicar MFA
            mfa: true  // Simular MFA completado para desarrollo
          });

          res.status(200).json({
            success: true,
            message: 'Login exitoso (MFA simulado - Duo no configurado)',
            data: {
              user: result.user,
              token: token,
              loginTime: new Date().toISOString(),
              authProvider: 'local',
              mfaSimulated: true
            }
          });
          return;
        }

        const duo =  getDuoClient();
        const state = duo.generateState();
        savePending(state, { userId: result.user._id , email: result.user.email, createdAt: Date.now() });

        const duoAuthUrl = await duo.createAuthUrl(result.user.email , state);

        res.status(200).json({
          success: true,
          message: 'MFA requerido: redirigir a Duo',
          data: { mfaRequired: true, duoAuthUrl }
        });
        return;
      }

    //OMITOR EL OBJETO USUARIO PARA DEVOLVER RETO MFA
      // Generar JWT con MFA simulado también para login normal
      const jwt = JWTService.getInstance();
      const token = jwt.generateToken({
        userId: result.user._id,
        username: result.user.username,
        email: result.user.email,
        role: result.user.role,
        authProvider: 'local+duo',  // Simular MFA completado
        mfa: true  // Simular MFA completado para desarrollo
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          user: result.user,
          token: token,
          loginTime: new Date().toISOString(),
          authProvider: 'local+duo'
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('Error en el controlador - login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Crear un nuevo registro de usuario
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, role }: RegisterRequest = req.body;

    // Validar que se proporcionen los campos requeridos
    if (!username || !email || !password) {
      res.status(400).json({
        success: false,
        message: 'Username, email y password son requeridos'
      });
      return;
    }

    // Verificar que el email cumpla con el formato correcto
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: 'Formato de email inválido'
      });
      return;
    }

    // Verificar que la contraseña cumpla con la longitud mínima y máxima
    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
      return;
    }


    // Crear usuario
    const result = await authService.createUser({
      username,
      email,
      password,
      role: role || 'user',
      isActive: true
    });

    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          user: result.user,
          registerTime: new Date().toISOString()
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('Error en el controlador - register:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Verificar si un usuario existe
export const checkUserExists = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;

    if (!username) {
      res.status(400).json({
        success: false,
        message: 'El parámetro username es requerido'
      });
      return;
    }


    const exists = await authService.userExists(username);

    res.status(200).json({
      success: true,
      message: exists ? 'Usuario encontrado' : 'Usuario no encontrado',
      data: {
        username: username,
        exists: exists
      }
    });

  } catch (error) {
    console.error('Error en el controlador - checkUserExists:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Obtener información de usuario por ID
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'El parámetro userId es requerido'
      });
      return;
    }


    const user = await authService.getUserById(userId);

    if (user) {
      res.status(200).json({
        success: true,
        message: 'Usuario encontrado',
        data: {
          user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt
          }
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

  } catch (error) {
    console.error('Error en el controlador - getUserById:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Debug endpoint para verificar token
export const debugToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No token provided',
        debug: {
          hasAuthHeader: !!authHeader,
          authHeader: authHeader
        }
      });
      return;
    }

    const token = authHeader.slice(7);
    const jwt = JWTService.getInstance();
    
    try {
      const decoded = jwt.verifyToken(token);
      const now = Math.floor(Date.now() / 1000);
      const exp = (decoded as any).exp || 0;
      const timeLeft = exp - now;
      
      res.status(200).json({
        success: true,
        message: 'Token válido',
        debug: {
          token: token.substring(0, 20) + '...',
          decoded: decoded,
          currentTime: now,
          expiresAt: exp,
          timeLeftSeconds: timeLeft,
          isExpired: timeLeft <= 0,
          mfaCompleted: decoded.mfa,
          // 🔥 Agregar información de configuración
          config: {
            jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1m',
            jwtSecret: process.env.JWT_SECRET ? 'configurado' : 'por defecto'
          }
        }
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: 'Token inválido',
        debug: {
          error: error.message,
          errorName: error.name,
          token: token.substring(0, 20) + '...'
        }
      });
    }
  } catch (error) {
    console.error('Error en debugToken:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Health check para autenticación
export const authHealthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      message: 'API de Autenticación funcionando correctamente',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      endpoints: {
        login: 'POST /auth/login - Iniciar sesión',
        register: 'POST /auth/register - Registrar nuevo usuario',
        checkUser: 'GET /auth/check/:username - Verificar si existe usuario',
        getUser: 'GET /auth/user/:userId - Obtener información de usuario',
        debugToken: 'GET /auth/debug-token - Debug del token JWT'
      }
    });
  } catch (error) {
    console.error('Error en el controlador - authHealthCheck:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

function redirectToFront(res: Response, params: Record<string, string>) {
  const url = new URL(duoConfig.frontSuccessUrl);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return res.redirect(url.toString());
}
export async function duoCallback(req: Request, res: Response): Promise<void> {
  const { state, duo_code } = req.query as { state?: string; duo_code?: string };

  if (!state || !duo_code) {
    res.status(400).send('Missing state or duo_code');
    return;
  }

  const pending = takePending(state);
  if (!pending) {
    res.status(400).send('Invalid or expired state');
    return;
  }

  try {
    const duo =  getDuoClient();
    const result = await duo.exchangeAuthorizationCodeFor2FAResult(String(duo_code), pending.email);
    if (result.auth_result.result !== 'allow') {
      redirectToFront(res, { mfa: 'denied' });
      return;
    }

    const jwt = JWTService.getInstance();
    const token = jwt.generateToken({
      userId: pending.userId,
      username: pending.email,  // o tu username real
      email: pending.email,
      role: 'user',             // o el role real de tu usuario
      authProvider: 'local+duo',
      mfa: true
    });

    redirectToFront(res, { mfa: 'ok', token });

  } catch (error) {
    console.error('Duo callback error:', error);
    redirectToFront(res, { mfa: 'error' });
  }
}
