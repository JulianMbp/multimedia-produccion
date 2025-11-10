import React, { createContext, useContext, useEffect, useState } from 'react';
import { isTokenValid, login, removeToken, saveToken } from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false); // Iniciar en false para mostrar login inmediatamente

  // No hacer auto-login, siempre mostrar el login primero
  useEffect(() => {
    // Limpiar cualquier token guardado al iniciar para forzar login
    // Esto asegura que SIEMPRE se muestre el login primero
    removeToken();
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  const handleLogin = async (email, password) => {
    try {
      const response = await login(email, password);
      setToken(response.token);
      setUser(response.user);
      saveToken(response.token);
      return { success: true };
    } catch (error) {
      console.error('Error en login:', error);
      return { 
        success: false, 
        error: error.message || 'Error al iniciar sesión' 
      };
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    removeToken();
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && isTokenValid(token),
    login: handleLogin,
    logout: handleLogout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

