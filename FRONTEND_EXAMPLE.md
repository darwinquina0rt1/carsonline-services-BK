# 🎨 Ejemplos de Implementación Frontend - Google OAuth

## 📱 React/Next.js Implementation

### 1. Instalar Dependencias

```bash
npm install @react-oauth/google jwt-decode
```

### 2. Configurar Google OAuth Provider

```jsx
// pages/_app.js o App.js
import { GoogleOAuthProvider } from '@react-oauth/google';

function MyApp({ Component, pageProps }) {
  return (
    <GoogleOAuthProvider clientId="TU_GOOGLE_CLIENT_ID">
      <Component {...pageProps} />
    </GoogleOAuthProvider>
  );
}

export default MyApp;
```

### 3. Componente de Login con Google

```jsx
// components/GoogleLogin.jsx
import { GoogleLogin } from '@react-oauth/google';
import { useState } from 'react';
import jwt_decode from 'jwt-decode';

const GoogleLoginComponent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError(null);

    try {
      // Decodificar el token para obtener los datos del usuario
      const decoded = jwt_decode(credentialResponse.credential);
      
      const response = await fetch('http://localhost:3005/api/auth/google/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          googleId: decoded.sub,
          email: decoded.email,
          name: decoded.name,
          givenName: decoded.given_name,
          familyName: decoded.family_name,
          picture: decoded.picture,
          accessToken: credentialResponse.credential
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Usuario autenticado exitosamente
        console.log('✅ Login exitoso:', result.data.user);
        console.log('🆕 Es nuevo usuario:', result.data.isNewUser);
        
        // Guardar datos del usuario en localStorage o estado global
        localStorage.setItem('user', JSON.stringify(result.data.user));
        localStorage.setItem('token', result.data.token); // Guardar el token JWT
        localStorage.setItem('authProvider', 'google');
        
        // Redirigir al dashboard
        window.location.href = '/dashboard';
        
      } else {
        setError(result.message);
        console.error('❌ Error en login:', result.message);
      }
    } catch (error) {
      setError('Error de conexión con el servidor');
      console.error('❌ Error de conexión:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Error en la autenticación con Google');
    console.log('❌ Login con Google falló');
  };

  return (
    <div className="google-login-container">
      <h2>Iniciar Sesión</h2>
      
      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}
      
      {loading && (
        <div className="loading">
          🔄 Autenticando...
        </div>
      )}
      
      <div className="login-options">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          disabled={loading}
          text="continue_with"
          shape="rectangular"
          size="large"
          width="300"
        />
        
        <div className="divider">
          <span>o</span>
        </div>
        
        {/* Aquí puedes agregar tu formulario de login tradicional */}
        <button className="traditional-login-btn">
          Iniciar sesión con email
        </button>
      </div>
    </div>
  );
};

export default GoogleLoginComponent;
```

### 4. Página de Login Completa

```jsx
// pages/login.jsx
import { useState } from 'react';
import GoogleLoginComponent from '../components/GoogleLogin';

const LoginPage = () => {
  const [loginMethod, setLoginMethod] = useState('google'); // 'google' o 'traditional'

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo">
          <h1>🚗 CarOnline</h1>
          <p>Tu plataforma de vehículos</p>
        </div>
        
        <div className="login-tabs">
          <button 
            className={`tab ${loginMethod === 'google' ? 'active' : ''}`}
            onClick={() => setLoginMethod('google')}
          >
            🔐 Continuar con Google
          </button>
          <button 
            className={`tab ${loginMethod === 'traditional' ? 'active' : ''}`}
            onClick={() => setLoginMethod('traditional')}
          >
            📧 Email y Contraseña
          </button>
        </div>
        
        <div className="login-content">
          {loginMethod === 'google' ? (
            <GoogleLoginComponent />
          ) : (
            <TraditionalLoginForm />
          )}
        </div>
        
        <div className="footer">
          <p>¿No tienes cuenta? <a href="/register">Regístrate aquí</a></p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
```

### 5. Hook Personalizado para Autenticación

```jsx
// hooks/useAuth.js
import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authProvider, setAuthProvider] = useState(null);

  useEffect(() => {
    // Verificar si hay usuario en localStorage
    const savedUser = localStorage.getItem('user');
    const savedProvider = localStorage.getItem('authProvider');
    
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setAuthProvider(savedProvider);
    }
    
    setLoading(false);
  }, []);

  const login = async (credentialResponse) => {
    try {
      // Decodificar el token para obtener los datos del usuario
      const decoded = jwt_decode(credentialResponse.credential);
      
      const response = await fetch('http://localhost:3005/api/auth/google/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          googleId: decoded.sub,
          email: decoded.email,
          name: decoded.name,
          givenName: decoded.given_name,
          familyName: decoded.family_name,
          picture: decoded.picture,
          accessToken: credentialResponse.credential
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setUser(result.data.user);
        setAuthProvider('google');
        localStorage.setItem('user', JSON.stringify(result.data.user));
        localStorage.setItem('token', result.data.token); // Guardar el token JWT
        localStorage.setItem('authProvider', 'google');
        return { success: true, isNewUser: result.data.isNewUser };
      } else {
        return { success: false, error: result.message };
      }
    } catch (error) {
      return { success: false, error: 'Error de conexión' };
    }
  };

  const logout = () => {
    setUser(null);
    setAuthProvider(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token'); // Remover el token JWT
    localStorage.removeItem('authProvider');
  };

  // Función para hacer peticiones autenticadas
  const authenticatedFetch = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      // Token expirado o inválido
      logout();
      throw new Error('Sesión expirada');
    }

    return response;
  };

  return {
    user,
    loading,
    authProvider,
    login,
    logout,
    authenticatedFetch,
    isAuthenticated: !!user
  };
};
```

### 6. Componente de Dashboard

```jsx
// components/Dashboard.jsx
import { useAuth } from '../hooks/useAuth';

const Dashboard = () => {
  const { user, logout, authProvider } = useAuth();

  if (!user) {
    return <div>Redirigiendo al login...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Bienvenido, {user.username}!</h1>
        <div className="user-info">
          {user.googleProfile?.picture && (
            <img 
              src={user.googleProfile.picture} 
              alt="Profile" 
              className="profile-picture"
            />
          )}
          <div className="user-details">
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Rol:</strong> {user.role}</p>
            <p><strong>Proveedor:</strong> {authProvider}</p>
            {user.googleProfile?.name && (
              <p><strong>Nombre:</strong> {user.googleProfile.name}</p>
            )}
          </div>
          <button onClick={logout} className="logout-btn">
            Cerrar Sesión
          </button>
        </div>
      </header>
      
      <main className="dashboard-content">
        <h2>🚗 Vehículos Disponibles</h2>
        {/* Aquí puedes agregar tu lista de vehículos */}
      </main>
    </div>
  );
};

export default Dashboard;

### 7. Ejemplo de Uso del Hook con Peticiones Autenticadas

```jsx
// components/VehicleList.jsx
import { useAuth } from '../hooks/useAuth';
import { useState, useEffect } from 'react';

const VehicleList = () => {
  const { authenticatedFetch, user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await authenticatedFetch('http://localhost:3005/api/vehicles');
        const data = await response.json();
        setVehicles(data.vehicles);
      } catch (error) {
        console.error('Error al cargar vehículos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [authenticatedFetch]);

  if (loading) return <div>Cargando vehículos...</div>;

  return (
    <div className="vehicle-list">
      <h2>🚗 Vehículos Disponibles</h2>
      {vehicles.map(vehicle => (
        <div key={vehicle._id} className="vehicle-card">
          <h3>{vehicle.brand} {vehicle.model}</h3>
          <p>Año: {vehicle.year}</p>
          <p>Precio: ${vehicle.price}</p>
        </div>
      ))}
    </div>
  );
};

export default VehicleList;
```

## 🎨 Estilos CSS (Opcional)

```css
/* styles/Login.css */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 400px;
}

.logo {
  text-align: center;
  margin-bottom: 2rem;
}

.login-tabs {
  display: flex;
  margin-bottom: 2rem;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
}

.tab {
  flex: 1;
  padding: 1rem;
  border: none;
  background: #f5f5f5;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab.active {
  background: #667eea;
  color: white;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  border: 1px solid #fcc;
}

.loading {
  text-align: center;
  padding: 1rem;
  color: #666;
}

.divider {
  text-align: center;
  margin: 1rem 0;
  position: relative;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #e0e0e0;
}

.divider span {
  background: white;
  padding: 0 1rem;
  color: #666;
}

.profile-picture {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
}

.logout-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.logout-btn:hover {
  background: #c82333;
}
```

## 🔧 Configuración Adicional

### Variables de Entorno (Frontend)

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3005/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=tu_google_client_id
```

### Manejo de Errores Mejorado

```jsx
// utils/api.js
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005/api';

export const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error en la petición');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Uso en componentes
const handleGoogleLogin = async (idToken) => {
  try {
    const result = await apiCall('/auth/google/login', {
      method: 'POST',
      body: JSON.stringify({ idToken })
    });
    
    return result;
  } catch (error) {
    console.error('Error en login:', error.message);
    throw error;
  }
};
```

## 🎯 Características del Ejemplo

### ✅ Funcionalidades Incluidas

1. **Login con Google** - Botón de "Continuar con Google"
2. **Manejo de Estados** - Loading, error, success
3. **Persistencia** - Guardado en localStorage
4. **Hook Personalizado** - useAuth para gestión de estado
5. **Dashboard** - Página de bienvenida con información del usuario
6. **Logout** - Cerrar sesión y limpiar datos
7. **Estilos** - CSS moderno y responsive
8. **Manejo de Errores** - Try-catch y mensajes de error
9. **Configuración** - Variables de entorno
10. **API Utils** - Funciones reutilizables para llamadas al API

### 🔄 Flujo Completo

1. Usuario hace clic en "Continuar con Google"
2. Se abre el popup de Google
3. Usuario selecciona su cuenta
4. Google retorna un token
5. Frontend envía token al backend
6. Backend verifica y crea/autentica usuario
7. Frontend recibe respuesta y redirige al dashboard
8. Usuario ve su información y puede navegar

---

**¡Con estos ejemplos tienes todo lo necesario para implementar Google OAuth en tu frontend!** 🚀
