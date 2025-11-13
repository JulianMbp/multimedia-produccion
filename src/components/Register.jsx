import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import './Register.css';

const Register = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [points, setPoints] = useState(0);
  const { register, backendAvailable } = useAuth();
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
      if (!pointsIntervalRef.current) {
        pointsIntervalRef.current = setInterval(() => {
          setPoints(prev => {
            const newPoints = prev + Math.floor(Math.random() * 10) + 1;
            if (newPoints % 100 === 0) {
              playBeep(800, 50);
            }
            return newPoints;
          });
        }, 100);
      }
    } else {
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
    
    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    playBeep(600, 80);

    try {
      const result = await register(email, password, name);
      
      if (!result.success) {
        setError(result.error || 'Error al registrar usuario');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Error al registrar usuario');
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
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
      <div className="register-card">
        {/* Header con información */}
        <div className="card-header">
          <div className="avatar">
            <div className="avatar-inner">+</div>
          </div>
          <div className="user-info">
            <h2 className="user-name">Crear Cuenta</h2>
            <p className="user-title">Únete a la aventura</p>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <div className="input-wrapper">
              <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre (opcional)"
                disabled={loading}
                className="modern-input"
              />
            </div>
          </div>

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
                placeholder="Contraseña (mín. 6 caracteres)"
                required
                disabled={loading}
                className="modern-input"
              />
            </div>
          </div>

          <div className="form-group">
            <div className="input-wrapper">
              <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar contraseña"
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
            className={`register-button ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Creando cuenta...
              </>
            ) : (
              <>
                <span>Crear Cuenta</span>
                <svg className="button-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Enlace para cambiar a login */}
        <div className="card-footer">
          <div className="switch-form">
            <span>¿Ya tienes una cuenta?</span>
            <button 
              type="button" 
              onClick={onSwitchToLogin}
              className="switch-button"
              disabled={loading}
            >
              Iniciar Sesión
            </button>
          </div>
        </div>

        {/* Estado del backend */}
        {backendAvailable !== undefined && (
          <div style={{
            marginTop: '16px',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            textAlign: 'center',
            backgroundColor: backendAvailable ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: backendAvailable ? '#22c55e' : '#ef4444',
            border: `1px solid ${backendAvailable ? '#22c55e' : '#ef4444'}`
          }}>
            {backendAvailable ? (
              <>✅ Backend conectado - Registro disponible</>
            ) : (
              <>⚠️ Backend no disponible - Registro no disponible</>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;

