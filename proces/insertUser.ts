import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../APP/configs/config';

// Definir el esquema para los usuarios (igual que en authService)
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

async function insertTestUser() {
  try {
    const configData = config();
    const mongoUri = configData.database.uri;
    const dbName = configData.database.name;
    
    if (!mongoUri) {
      throw new Error('MONGO_URI no está definida en las variables de entorno');
    }

    // Construir la URI completa con el nombre de la base de datos
    const fullUri = mongoUri.endsWith('/') 
      ? `${mongoUri}${dbName}` 
      : `${mongoUri}/${dbName}`;

    console.log('Conectando a MongoDB...');
    await mongoose.connect(fullUri);
    console.log(`Conectado a MongoDB - Base de datos: ${dbName}`);

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ username: 'admin' });
    
    if (existingUser) {
      console.log('El usuario admin ya existe en la base de datos');
      console.log('Eliminando usuario existente para recrearlo...');
      await User.findByIdAndDelete(existingUser._id);
    }

    // Encriptar contraseña "1234567"
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('1234567', saltRounds);

    // Crear tu usuario específico
    const testUser = new User({
      username: 'admin',
      email: 'darwin@gmail.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });

    await testUser.save();
    console.log('✅ Usuario creado exitosamente:');
    console.log('- Username: admin');
    console.log('- Email: darwin@gmail.com');
    console.log('- Password: 1234567 (encriptada en DB)');
    console.log('- Role: admin');
    console.log('\n🔐 Para hacer login usa:');
    console.log('Username: admin');
    console.log('Password: 1234567');

    await mongoose.connection.close();
    console.log('\nConexión cerrada. Usuario insertado correctamente.');

  } catch (error) {
    console.error('Error al insertar usuario de prueba:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

// Ejecutar la función
insertTestUser();


//comando para insertar usuario npx ts-node proces/insertUser.ts