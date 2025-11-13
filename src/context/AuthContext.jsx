import React, { createContext, useContext, useEffect, useState } from 'react';
import { isTokenValid, login, removeToken, saveToken, getToken, isBackendAvailable, isJWTToken } from '../services/authService';

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
  const [loading, setLoading] = useState(true); // Iniciar en true para verificar backend primero
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [checkingBackend, setCheckingBackend] = useState(true);

  // Verificar disponibilidad del backend al iniciar
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const available = await isBackendAvailable();
        setBackendAvailable(available);
        console.log(available ? '✅ Backend disponible' : '⚠️ Backend no disponible');
      } catch (error) {
        console.error('Error verificando backend:', error);
        setBackendAvailable(false);
      } finally {
        setCheckingBackend(false);
      }
    };
    
    checkBackend();
  }, []);

  // Validar token al iniciar y periódicamente
  useEffect(() => {
    if (checkingBackend) return; // Esperar a que termine la verificación del backend
    
    const validateToken = async () => {
      const savedToken = getToken();
      
      if (!savedToken) {
        setLoading(false);
        return;
      }
      
      // Si el backend está disponible, requerir JWT válido
      const requireJWT = backendAvailable;
      const isValid = isTokenValid(savedToken, requireJWT);
      
      if (!isValid) {
        console.warn('⚠️ Token inválido o expirado, limpiando...');
        removeToken();
        setToken(null);
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Si el backend está disponible y el token no es JWT, rechazarlo
      if (backendAvailable && !isJWTToken(savedToken)) {
        console.warn('⚠️ Token de backdoor no permitido cuando backend está disponible');
        removeToken();
        setToken(null);
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Token válido, mantener sesión
      setToken(savedToken);
      setLoading(false);
    };
    
    validateToken();
    
    // Validar token periódicamente cada 5 minutos
    const interval = setInterval(() => {
      const savedToken = getToken();
      if (savedToken) {
        const requireJWT = backendAvailable;
        const isValid = isTokenValid(savedToken, requireJWT);
        if (!isValid) {
          console.warn('⚠️ Token expirado durante la sesión');
          removeToken();
          setToken(null);
          setUser(null);
        } else if (backendAvailable && !isJWTToken(savedToken)) {
          console.warn('⚠️ Token de backdoor detectado, cerrando sesión');
          removeToken();
          setToken(null);
          setUser(null);
        }
      }
    }, 5 * 60 * 1000); // 5 minutos
    
    return () => clearInterval(interval);
  }, [backendAvailable, checkingBackend]);

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
    isAuthenticated: !!token && isTokenValid(token, backendAvailable),
    login: handleLogin,
    logout: handleLogout,
    loading: loading || checkingBackend,
    backendAvailable,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

