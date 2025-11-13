/**
 * Configuración centralizada de la API
 * Define la URL base del backend de forma consistente en toda la aplicación
 */

// URL base del backend - puede ser configurada mediante variable de entorno
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Endpoints disponibles
export const API_ENDPOINTS = {
  // Autenticación
  auth: {
    register: `${API_BASE_URL}/auth/register`,
    login: `${API_BASE_URL}/auth/login`,
    me: `${API_BASE_URL}/auth/me`,
  },
  
  // Niveles
  levels: {
    all: `${API_BASE_URL}/levels`,
    byId: (id) => `${API_BASE_URL}/levels/${id}`,
    coinsCount: (id) => `${API_BASE_URL}/levels/${id}/coins-count`,
  },
  
  // Puntuaciones
  scores: {
    save: `${API_BASE_URL}/scores`,
    ranking: `${API_BASE_URL}/scores`,
    me: `${API_BASE_URL}/scores/me`,
    best: `${API_BASE_URL}/scores/best`,
  },
  
  // Health check
  health: `${API_BASE_URL}/health`,
};

// Función helper para verificar si el backend está disponible
export const checkBackendHealth = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.health, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

