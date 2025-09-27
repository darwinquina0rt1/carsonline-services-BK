import mongoose from 'mongoose';
import { config } from '../APP/configs/config';

// Definir el esquema actualizado para los usuarios
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  // Campos específicos para Google OAuth
  googleId: { type: String, sparse: true },
  googleProfile: {
    name: String,
    picture: String,
    locale: String
  },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' }
}, {
  timestamps: true
});

// Definir el esquema actualizado para los logs de sesión
const sessionLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, required: true },
  loginTime: { type: Date, default: Date.now },
  ipAddress: { type: String },
  userAgent: { type: String },
  status: { type: String, enum: ['success', 'failed'], default: 'success' },
  message: { type: String },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' }
}, {
  timestamps: true
});

// Crear los modelos
const User = mongoose.model('User', userSchema, 'users');
const SessionLog = mongoose.model('SessionLog', sessionLogSchema, 'sesion_logs');

async function updateSchemaForGoogle() {
  try {
    const configData = config();
    const mongoUri = configData.database.uri;
    const dbName = configData.database.name;
    
    if (!mongoUri) {
      throw new Error('MONGO_URI no está definida en las variables de entorno');
    }

    // Construir la URI completa
    const fullUri = mongoUri.endsWith('/') 
      ? `${mongoUri}${dbName}` 
      : `${mongoUri}/${dbName}`;

    await mongoose.connect(fullUri);

    // Verificar si los campos de Google ya existen
    const sampleUser = await User.findOne({});
    
    if (sampleUser && sampleUser.googleId !== undefined) {
    } else {
      
      // Actualizar usuarios existentes para agregar campos de Google
      const updateResult = await User.updateMany(
        { authProvider: { $exists: false } },
        { 
          $set: { 
            authProvider: 'local',
            googleId: null,
            googleProfile: null
          } 
        }
      );

    }

    // Verificar logs de sesión
    const sampleLog = await SessionLog.findOne({});
    
    if (sampleLog && sampleLog.authProvider !== undefined) {
    } else {
      
      const logUpdateResult = await SessionLog.updateMany(
        { authProvider: { $exists: false } },
        { $set: { authProvider: 'local' } }
      );

    }


    await mongoose.connection.close();

  } catch (error) {
    console.error('Error al actualizar esquema:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

// Ejecutar la función
updateSchemaForGoogle();

//comando para actualizar esquema: npx ts-node proces/updateSchemaForGoogle.ts
