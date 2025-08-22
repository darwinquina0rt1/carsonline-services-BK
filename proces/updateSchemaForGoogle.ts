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

    console.log('Conectando a MongoDB...');
    await mongoose.connect(fullUri);
    console.log(`Conectado a MongoDB - Base de datos: ${dbName}`);

    // Verificar si los campos de Google ya existen
    const sampleUser = await User.findOne({});
    
    if (sampleUser && sampleUser.googleId !== undefined) {
      console.log('✅ Los campos de Google ya están configurados en la base de datos');
      console.log('No es necesario actualizar el esquema');
    } else {
      console.log('🔄 Actualizando esquema para soporte de Google OAuth...');
      
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

      console.log(`✅ Actualizados ${updateResult.modifiedCount} usuarios existentes`);
      console.log('✅ Esquema actualizado correctamente para soporte de Google OAuth');
    }

    // Verificar logs de sesión
    const sampleLog = await SessionLog.findOne({});
    
    if (sampleLog && sampleLog.authProvider !== undefined) {
      console.log('✅ Los campos de authProvider ya están configurados en los logs');
    } else {
      console.log('🔄 Actualizando logs de sesión para incluir authProvider...');
      
      const logUpdateResult = await SessionLog.updateMany(
        { authProvider: { $exists: false } },
        { $set: { authProvider: 'local' } }
      );

      console.log(`✅ Actualizados ${logUpdateResult.modifiedCount} logs de sesión`);
    }

    console.log('\n🎉 Actualización completada exitosamente!');
    console.log('\n📋 Resumen de cambios:');
    console.log('- Agregado campo googleId para almacenar ID de Google');
    console.log('- Agregado campo googleProfile para información del perfil');
    console.log('- Agregado campo authProvider para distinguir entre local y Google');
    console.log('- Actualizado logs de sesión para incluir authProvider');
    console.log('\n🔧 Próximos pasos:');
    console.log('1. Configurar variables de entorno GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET');
    console.log('2. Configurar proyecto en Google Cloud Console');
    console.log('3. Implementar Google Sign-In en el frontend');

    await mongoose.connection.close();
    console.log('\nConexión cerrada. Esquema actualizado correctamente.');

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
