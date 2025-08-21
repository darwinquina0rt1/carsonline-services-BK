import express from 'express';
import { config } from './APP/configs/config';

const app = express();
const serverConfig = config();

// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ 
    message: '¡Backend funcionando correctamente!',
    port: serverConfig.server.port,
    environment: serverConfig.server.nodeEnv
  });
});

// Iniciar el servidor
app.listen(serverConfig.server.port, () => {
  console.log(` Servidor corriendo en el puerto ${serverConfig.server.port}`);
  console.log(` Entorno: ${serverConfig.server.nodeEnv}`);
  console.log(` URI de la base de datos: ${serverConfig.database.uri}`);
});

export default app;
