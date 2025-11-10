import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [points, setPoints] = useState(0);
  const { login } = useAuth();
  const pointsIntervalRef = useRef(null);

  // Generar sonido de beep usando Web Audio API
  const playBeep = (frequency = 800, duration = 50) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (e) {
      console.log('Audio no disponible');
    }
  };

  // Contador de puntos animado
  useEffect(() => {
    if (!loading) {
      // Iniciar contador cuando no está cargando
      if (!pointsIntervalRef.current) {
        pointsIntervalRef.current = setInterval(() => {
          setPoints(prev => {
            const newPoints = prev + Math.floor(Math.random() * 10) + 1;
            // Reproducir sonido cada 100 puntos
            if (newPoints % 100 === 0) {
              playBeep(800, 50);
            }
            return newPoints;
          });
        }, 100);
      }
    } else {
      // Detener contador cuando está cargando
      if (pointsIntervalRef.current) {
        clearInterval(pointsIntervalRef.current);
        pointsIntervalRef.current = null;
      }
    }

    return () => {
      if (pointsIntervalRef.current) {
        clearInterval(pointsIntervalRef.current);
        pointsIntervalRef.current = null;
      }
    };
  }, [loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Sonido de click
    playBeep(600, 80);

    try {
      const result = await login(email, password);
      
      if (!result.success) {
        setError(result.error || 'Error al iniciar sesión');
        setLoading(false);
        // El contador se reiniciará automáticamente cuando loading sea false
      }
      // Si es exitoso, el contexto manejará el cambio de estado automáticamente
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
      setLoading(false);
      // El contador se reiniciará automáticamente cuando loading sea false
    }
  };

  return (
    <div className="login-container">
      {/* Partículas de fondo animadas */}
      <div className="particles">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="particle" style={{ 
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${5 + Math.random() * 5}s`
          }} />
        ))}
      </div>

      {/* Contador de puntos */}
      <div className="points-counter">
        <div className="points-label">Puntos</div>
        <div className="points-value">{points.toLocaleString()}</div>
      </div>

      {/* Tarjeta principal */}
      <div className="login-card">
        {/* Header con información */}
        <div className="card-header">
          <div className="avatar">
            <div className="avatar-inner">JB</div>
          </div>
          <div className="user-info">
            <h2 className="user-name">Julian Bastidas</h2>
            <p className="user-title">Ingeniero de Software</p>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <div className="input-wrapper">
              <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo electrónico"
                required
                disabled={loading}
                className="modern-input"
              />
            </div>
          </div>

          <div className="form-group">
            <div className="input-wrapper">
              <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                required
                disabled={loading}
                className="modern-input"
              />
            </div>
          </div>

          {error && (
            <div className="error-message">
              <svg className="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className={`login-button ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Iniciando sesión...
              </>
            ) : (
              <>
                <span>Entrar al Juego</span>
                <svg className="button-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="card-footer">
          <div className="info-badge">
            <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Puerta trasera: admin@admin.com / secret</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
