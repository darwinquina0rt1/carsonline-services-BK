import express from 'express';
import { 
    login,
    register,
    checkUserExists,
    getUserById,
    authHealthCheck,
    debugToken,
    duoCallback
} from '../controllers/authController';

const router = express.Router();

// Health check para autenticación
router.get('/health', authHealthCheck);

// Login de usuario
router.post('/login', login);

// Registro de nuevo usuario
router.post('/register', register);

// Verificar si un usuario existe
router.get('/check/:username', checkUserExists);

// Obtener información de usuario por ID
router.get('/user/:userId', getUserById);

// Debug endpoint para verificar token
router.get('/debug-token', debugToken);

router.get('/duo/callback', duoCallback);

// Ruta por defecto del API de autenticación
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API de Autenticación - CarOnline Services',
    version: '1.0.0',
    endpoints: {
      health: 'GET /auth/health - Verificar estado del API de autenticación',
      login: 'POST /auth/login - Iniciar sesión',
      register: 'POST /auth/register - Registrar nuevo usuario',
      checkUser: 'GET /auth/check/:username - Verificar si existe usuario',
      getUser: 'GET /auth/user/:userId - Obtener información de usuario'
    },
    example: {
      login: {
        method: 'POST',
        url: '/api/auth/login',
        body: {
          username: 'usuario123',
          password: 'contraseña123'
        }
      },
      register: {
        method: 'POST',
        url: '/api/auth/register',
        body: {
          username: 'nuevo_usuario',
          email: 'usuario@ejemplo.com',
          password: 'contraseña123',
          role: 'user'
        }
      },
      checkUser: {
        method: 'GET',
        url: '/api/auth/check/usuario123'
      },
      getUser: {
        method: 'GET',
        url: '/api/auth/user/64f1a2b3c4d5e6f7g8h9i0j1'
      }
    }
  });
});

export default router;