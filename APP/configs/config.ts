import dotenv from 'dotenv';

// Cargar variables de entorno desde el archivo .env
dotenv.config();

export const config = () => {
  return {
    // Configuración de la base de datos
    database: {
      uri: process.env.MONGO_URI,
    },
    
    // Configuración del servidor
    server: {
      port: process.env.PORT || 3005,
      nodeEnv: process.env.NODE_ENV || 'development',
    },
  };
};

export default config;
