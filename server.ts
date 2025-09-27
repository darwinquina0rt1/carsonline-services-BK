import express from 'express';
import cors from 'cors';
import { config } from './APP/configs/config';
import { endpointLogger } from './APP/middleware/endpointLogger';

const app = express();
const serverConfig = config();

// Middleware para CORS
app.use(cors({
  origin: '*', // En producción, especifica los dominios permitidos
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para logging de endpoints (debe ir después de los middlewares de parsing)
app.use(endpointLogger);

// Ruta principal
app.get('/', (req, res) => {
  res.json({ 
    message: '¡Backend funcionando correctamente!',
    port: serverConfig.server.port,
    environment: serverConfig.server.nodeEnv,
    database: serverConfig.database.name,
    api: {
      baseUrl: `/api`,
      endpoints: [
        'GET /api - Información del API',
        'GET /api/vehicles - Vehículos agrupados por marca',
        'GET /api/vehicles/brand/:marca - Vehículos por marca específica',
        'GET /api/brands - Marcas disponibles',
        'GET /api/stats - Estadísticas por marca',
        'GET /api/health - Estado del servidor',
        'POST /api/auth/login - Iniciar sesión',
        'POST /api/auth/register - Registrar nuevo usuario',
        'GET /api/auth/check/:username - Verificar si existe usuario',
        'GET /api/auth/user/:userId - Obtener información de usuario',
        'POST /api/auth/google/login - Iniciar sesión con Google',
        'POST /api/auth/google/verify - Verificar token de Google',
        'GET /api/auth/google/health - Estado de autenticación con Google',
        'GET /api/logs/health - Estado del sistema de logs',
        'GET /api/logs/user/:userId - Logs de usuario específico',
        'GET /api/logs/endpoint/:endpoint - Logs de endpoint específico',
        'GET /api/logs/stats - Estadísticas de uso de endpoints',
        'DELETE /api/logs/clean - Limpiar logs antiguos'
      ]
    }
  });
});

// Configurar rutas del API
import vehicleRouter from './APP/routers/router';
import authRouter from './APP/routers/auth';
import googleAuthRouter from './APP/routers/googleAuth';
import permissionRouter from './APP/routers/permissions';
import logRouter from './APP/routers/logs';

app.use('/api', vehicleRouter);
app.use('/api/auth', authRouter);
app.use('/api/auth/google', googleAuthRouter);
app.use('/api/permissions', permissionRouter);
app.use('/api/logs', logRouter);

// Manejo de errores global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error global:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
  });
});

// Iniciar el servidor
app.listen(serverConfig.server.port, () => {
});

export default app;


//comando para ejecutar el script npx ts-node server.ts
//heroku local web -f Procfile.dev