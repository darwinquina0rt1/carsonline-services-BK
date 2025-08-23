import express from 'express';
import cors from 'cors';
import { config } from './APP/configs/config';

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
        'GET /api/auth/google/health - Estado de autenticación con Google'
      ]
    }
  });
});

// Configurar rutas del API
import vehicleRouter from './APP/routers/router';
import authRouter from './APP/routers/auth';
import googleAuthRouter from './APP/routers/googleAuth';

app.use('/api', vehicleRouter);
app.use('/api/auth', authRouter);
app.use('/api/auth/google', googleAuthRouter);

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
  console.log(` Servidor CarOnline corriendo en el puerto ${serverConfig.server.port}`);
  console.log(` Entorno: ${serverConfig.server.nodeEnv}`);
  console.log(`  Base de datos: ${serverConfig.database.name}`);
  console.log(` API disponible en: http://localhost:${serverConfig.server.port}/api`);
  console.log(` Health check: http://localhost:${serverConfig.server.port}/api/health`);
});

export default app;


//comando para ejecutar el script npx ts-node server.ts
//heroku local web -f Procfile.dev