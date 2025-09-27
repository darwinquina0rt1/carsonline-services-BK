import { Request, Response } from 'express';
import GoogleAuthService from '../services/googleAuthService';
import { getClientIP } from '../src/utils/ipUtils';

const googleAuthService = GoogleAuthService.getInstance();

// Interfaz para la petición de login con Google
interface GoogleLoginRequest {
  googleId: string;
  email: string;
  name: string;
  givenName: string;
  familyName: string;
  picture: string;
  accessToken: string;
}

// Login con Google
export const loginWithGoogle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { googleId, email, name, givenName, familyName, picture, accessToken }: GoogleLoginRequest = req.body;

    // Validar que se proporcionen los campos requeridos
    if (!googleId || !email || !name || !accessToken) {
      res.status(400).json({
        success: false,
        message: 'googleId, email, name y accessToken son requeridos'
      });
      return;
    }

    // Obtener IP y User-Agent
    const ipAddress = getClientIP(req);
    const userAgent = req.get('User-Agent') || 'unknown';


    // Autenticar con Google usando los datos del perfil
    const result = await googleAuthService.authenticateWithGoogleProfile({
      googleId,
      email,
      name,
      givenName,
      familyName,
      picture,
      accessToken
    }, ipAddress, userAgent);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          user: result.user,
          token: result.token,
          isNewUser: result.isNewUser,
          loginTime: new Date().toISOString(),
          authProvider: 'google'
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('Error en el controlador - loginWithGoogle:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Verificar token de Google (para validación en el frontend)
export const verifyGoogleToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accessToken }: { accessToken: string } = req.body;

    if (!accessToken) {
      res.status(400).json({
        success: false,
        message: 'Access token de Google es requerido'
      });
      return;
    }


    // Verificar el token
    const googleProfile = await googleAuthService.verifyGoogleAccessToken(accessToken);

    res.status(200).json({
      success: true,
      message: 'Token de Google válido',
      data: {
        googleProfile: {
          name: googleProfile.name,
          email: googleProfile.email,
          picture: googleProfile.picture,
          email_verified: googleProfile.email_verified
        }
      }
    });

  } catch (error) {
    console.error('Error en el controlador - verifyGoogleToken:', error);
    res.status(401).json({
      success: false,
      message: 'Token de Google inválido o expirado',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Health check para autenticación con Google
export const googleAuthHealthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      message: 'API de Autenticación con Google funcionando correctamente',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      endpoints: {
        login: 'POST /auth/google/login - Iniciar sesión con Google',
        verify: 'POST /auth/google/verify - Verificar token de Google',
        health: 'GET /auth/google/health - Verificar estado del API'
      },
      features: {
        automaticUserCreation: 'Los usuarios se crean automáticamente al hacer login con Google',
        sessionLogging: 'Todos los inicios de sesión se registran con IP y User-Agent',
        profileSync: 'La información del perfil de Google se sincroniza automáticamente'
      }
    });
  } catch (error) {
    console.error('Error en el controlador - googleAuthHealthCheck:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
