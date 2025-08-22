import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../APP/configs/config';

// Definir el esquema para los usuarios
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Crear el modelo
const User = mongoose.model('User', userSchema, 'users');

async function encryptExistingUser() {
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

    // Buscar el usuario admin
    const user = await User.findOne({ username: 'admin' });
    
    if (!user) {
      console.log('Usuario admin no encontrado');
      await mongoose.connection.close();
      return;
    }

    console.log('Usuario encontrado:', user.username);
    console.log('Contraseña actual:', user.password);

    // Encriptar la contraseña "1234567"
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('1234567', saltRounds);

    // Actualizar el usuario con la contraseña encriptada
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword
    });

    console.log('✅ Contraseña encriptada exitosamente');
    console.log('Nueva contraseña encriptada:', hashedPassword);
    console.log('Ahora puedes hacer login con:');
    console.log('- Username: admin');
    console.log('- Password: 1234567');

    await mongoose.connection.close();
    console.log('\nConexión cerrada. Usuario actualizado correctamente.');

  } catch (error) {
    console.error('Error al encriptar usuario:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

// Ejecutar la función
encryptExistingUser();
