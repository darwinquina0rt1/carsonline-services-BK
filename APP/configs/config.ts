import dotenv from 'dotenv';

// Cargar variables de entorno desde el archivo .env
dotenv.config();

export const config = () => {
  return {
    // Configuración de la base de datos
    database: {
      uri: process.env.MONGO_URI,
      name: 'main_webappcars',
    },
    
    // Configuración del servidor
    server: {
      port: process.env.PORT || 3005,
      nodeEnv: process.env.NODE_ENV || 'development',
    },

      // Configuración de Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
  },
  // Configuración de JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'tu-secret-key-super-segura',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  };
};

export default config;
