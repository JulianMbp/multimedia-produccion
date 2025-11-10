// Servicio de autenticación con fallback hardcodeado
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Credenciales de puerta trasera (hardcodeadas)
const BACKDOOR_CREDENTIALS = {
  email: 'admin@admin.com',
  password: 'secret',
};

// Función para generar token de backdoor
const generateBackdoorToken = () => {
  return btoa(JSON.stringify({
    email: BACKDOOR_CREDENTIALS.email,
    exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutos
    iat: Math.floor(Date.now() / 1000),
  }));
};

/**
 * Intenta hacer login con el backend
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{token: string, refreshToken: string, user: object}>}
 */
export const login = async (email, password) => {
  // PRIMERO: Verificar si son las credenciales de puerta trasera
  // Si coinciden, dejar pasar directamente sin ir al backend
  if (email === BACKDOOR_CREDENTIALS.email && password === BACKDOOR_CREDENTIALS.password) {
    console.warn('⚠️ Usando puerta trasera (backdoor) - Acceso directo sin BD');
    const backdoorToken = generateBackdoorToken();
    return {
      token: backdoorToken,
      refreshToken: backdoorToken + '_refresh',
      tokenExpires: Date.now() + (15 * 60 * 1000), // 15 minutos
      user: {
        id: 'backdoor-user',
        email: BACKDOOR_CREDENTIALS.email,
        firstName: 'Admin',
        lastName: 'User',
      },
    };
  }

  // SEGUNDO: Si NO son credenciales de backdoor, ir al backend para obtener JWT
  try {
    const response = await fetch(`${API_BASE_URL}/auth/email/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      // Si el backend responde con error, lanzar excepción
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Credenciales inválidas');
    }

    // Si el backend responde correctamente, devolver el JWT
    const data = await response.json();
    console.log('✅ Login exitoso con backend, token JWT recibido');
    return data;
  } catch (error) {
    // Si hay error de conexión (red, backend caído, etc.)
    console.error('❌ Error conectando con el backend:', error);
    
    // Si no son credenciales de backdoor y hay error de conexión, lanzar error
    throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
  }
};

/**
 * Guarda el token en localStorage
 */
export const saveToken = (token) => {
  localStorage.setItem('auth_token', token);
};

/**
 * Obtiene el token del localStorage
 */
export const getToken = () => {
  return localStorage.getItem('auth_token');
};

/**
 * Elimina el token del localStorage
 */
export const removeToken = () => {
  localStorage.removeItem('auth_token');
};

/**
 * Verifica si hay un token guardado
 */
export const isAuthenticated = () => {
  return !!getToken();
};

/**
 * Verifica si el token es válido (no expirado)
 */
export const isTokenValid = (token) => {
  if (!token) return false;
  
  try {
    // Si es un token JWT real, tiene el formato: header.payload.signature
    if (token.includes('.')) {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        const now = Math.floor(Date.now() / 1000);
        // Verificar expiración si existe
        if (payload.exp) {
          return payload.exp > now;
        }
        // Si no tiene exp, asumimos válido
        return true;
      }
    }
    
    // Si es el token de backdoor (formato base64 simple)
    // Verificamos si existe y no ha expirado según nuestro cálculo
    const payload = JSON.parse(atob(token));
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    }
    return true;
  } catch (e) {
    // Si hay error parseando, asumimos que el token no es válido
    console.error('Error validando token:', e);
    return false;
  }
};

