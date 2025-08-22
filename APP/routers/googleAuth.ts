import express from 'express';
import { 
    loginWithGoogle,
    verifyGoogleToken,
    googleAuthHealthCheck
} from '../controllers/googleAuthController';

const router = express.Router();

// Health check para autenticación con Google
router.get('/health', googleAuthHealthCheck);

// Login con Google
router.post('/login', loginWithGoogle);

// Verificar token de Google
router.post('/verify', verifyGoogleToken);

// Ruta por defecto del API de autenticación con Google
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API de Autenticación con Google - CarOnline Services',
    version: '1.0.0',
    endpoints: {
      health: 'GET /auth/google/health - Verificar estado del API de autenticación con Google',
      login: 'POST /auth/google/login - Iniciar sesión con Google',
      verify: 'POST /auth/google/verify - Verificar token de Google'
    },
    example: {
      login: {
        method: 'POST',
        url: '/api/auth/google/login',
        body: {
          idToken: 'google_id_token_from_frontend'
        }
      },
      verify: {
        method: 'POST',
        url: '/api/auth/google/verify',
        body: {
          idToken: 'google_id_token_to_verify'
        }
      }
    },
    features: {
      automaticUserCreation: 'Los usuarios se crean automáticamente al hacer login con Google',
      sessionLogging: 'Todos los inicios de sesión se registran con IP y User-Agent',
      profileSync: 'La información del perfil de Google se sincroniza automáticamente',
      emailVerification: 'Los emails de Google están pre-verificados',
      uniqueUsernames: 'Los usernames se generan automáticamente de forma única'
    },
    setup: {
      googleConsole: 'Configurar proyecto en Google Cloud Console',
      credentials: 'Obtener Client ID y Client Secret',
      environment: 'Configurar variables de entorno GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET',
      frontend: 'Implementar Google Sign-In en el frontend'
    }
  });
});

export default router;
