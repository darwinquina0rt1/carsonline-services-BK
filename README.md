# CarOnline Services API

API REST para gestionar información de vehículos, desarrollado con Node.js, TypeScript, Express y MongoDB.

## 🚀 Características

- **Base de datos**: MongoDB con colección `cars` en la base de datos `main_webappcars`
- **Arquitectura**: Patrón MVC (Model-View-Controller)
- **Patrón de diseño**: Singleton para el servicio de base de datos
- **Respuestas**: Formato JSON estandarizado
- **CORS**: Habilitado para desarrollo frontend

## 📋 Endpoints Disponibles

### 1. Información del API
```
GET /
```
Retorna información general del API y endpoints disponibles.

### 2. Health Check
```
GET /api/health
```
Verifica el estado del servidor.

### 3. Vehículos Agrupados por Marca
```
GET /api/vehicles
```
Retorna todos los vehículos agrupados por marca.

**Respuesta:**
```json
{
  "success": true,
  "message": "Vehículos obtenidos exitosamente",
  "data": {
    "Toyota": [
      {
        "id": 1,
        "marca": "Toyota",
        "modelo": "Camry",
        "año": "2024",
        "precio": "Q195,000",
        "estado": "Disponible",
        "kilometraje": "15,000 km",
        "color": "Blanco",
        "image": "https://images.unsplash.com/..."
      }
    ],
    "Honda": [...]
  },
  "totalBrands": 25,
  "totalVehicles": 100
}
```

### 4. Vehículos por Marca Específica
```
GET /api/vehicles/brand/:marca
```
Retorna todos los vehículos de una marca específica.

**Ejemplo:** `GET /api/vehicles/brand/Toyota`

### 5. Marcas Disponibles
```
GET /api/brands
```
Retorna la lista de todas las marcas disponibles.

**Respuesta:**
```json
{
  "success": true,
  "message": "Marcas obtenidas exitosamente",
  "data": ["Audi", "BMW", "Honda", "Toyota", ...],
  "total": 25
}
```

### 6. Estadísticas por Marca
```
GET /api/stats
```
Retorna estadísticas de vehículos por marca (total, disponibles, vendidos, en mantenimiento).

## 🛠️ Instalación y Configuración

### Prerrequisitos
- Node.js (v14 o superior)
- MongoDB
- npm o yarn

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd carsonline-services-BK
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crear un archivo `.env` en la raíz del proyecto:
```env
MONGO_URI=mongodb://localhost:27017
PORT=3005
NODE_ENV=development
```

### 4. Insertar datos de prueba
```bash
npm run insert-cars
```

### 5. Ejecutar el servidor
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 📊 Estructura de Datos

### Vehículo
```typescript
interface Vehicle {
  id: number;           // ID único del vehículo
  marca: string;        // Marca del vehículo
  modelo: string;       // Modelo del vehículo
  año: string;          // Año del vehículo
  precio: string;       // Precio en Quetzales
  estado: string;       // Disponible, Vendido, En mantenimiento
  kilometraje: string;  // Kilometraje del vehículo
  color: string;        // Color del vehículo
  image: string;        // URL de la imagen
}
```

## 🏗️ Arquitectura del Proyecto

```
carsonline-services-BK/
├── APP/
│   ├── configs/
│   │   └── config.ts          # Configuración de la aplicación
│   ├── controllers/
│   │   └── controller.ts      # Controladores de la API
│   ├── routers/
│   │   └── router.ts          # Definición de rutas
│   └── services/
│       └── services.ts        # Lógica de negocio y acceso a datos
├── proces/
│   └── insertcars.ts          # Script para insertar datos de prueba
├── server.ts                  # Servidor principal
├── package.json
└── README.md
```

## 🔧 Scripts Disponibles

- `npm start` - Inicia el servidor en modo producción
- `npm run dev` - Inicia el servidor en modo desarrollo
- `npm run build` - Compila el proyecto TypeScript
- `npm run insert-cars` - Ejecuta el script para insertar vehículos de prueba

## 🌐 URLs del API

- **Servidor local**: `http://localhost:3005`
- **API base**: `http://localhost:3005/api`
- **Documentación**: `http://localhost:3005/api`

## 📝 Ejemplos de Uso

### Frontend (JavaScript)
```javascript
// Obtener todos los vehículos agrupados por marca
fetch('http://localhost:3005/api/vehicles')
  .then(response => response.json())
  .then(data => {
    console.log('Vehículos:', data.data);
    console.log('Total de marcas:', data.totalBrands);
  });

// Obtener vehículos de Toyota
fetch('http://localhost:3005/api/vehicles/brand/Toyota')
  .then(response => response.json())
  .then(data => {
    console.log('Vehículos Toyota:', data.data.vehicles);
  });

// Obtener marcas disponibles
fetch('http://localhost:3005/api/brands')
  .then(response => response.json())
  .then(data => {
    console.log('Marcas:', data.data);
  });
```

### Frontend (React)
```jsx
import { useState, useEffect } from 'react';

function VehicleList() {
  const [vehicles, setVehicles] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3005/api/vehicles')
      .then(response => response.json())
      .then(data => {
        setVehicles(data.data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      {Object.entries(vehicles).map(([marca, cars]) => (
        <div key={marca}>
          <h2>{marca}</h2>
          {cars.map(car => (
            <div key={car.id}>
              <h3>{car.modelo}</h3>
              <p>Precio: {car.precio}</p>
              <p>Estado: {car.estado}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

## 🚨 Manejo de Errores

El API retorna errores en formato JSON:

```json
{
  "success": false,
  "message": "Descripción del error",
  "error": "Detalles del error (solo en desarrollo)"
}
```

## 📈 Estado del Proyecto

- ✅ API REST funcional
- ✅ Conexión a MongoDB
- ✅ Agrupación por marca
- ✅ Endpoints documentados
- ✅ Manejo de errores
- ✅ CORS habilitado
- ✅ TypeScript configurado

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia ISC.
