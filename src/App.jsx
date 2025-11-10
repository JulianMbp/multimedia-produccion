// src/App.jsx
import { useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import Experience from './Experience/Experience';
import Login from './components/Login';
import LogoutButton from './components/LogoutButton';

const App = () => {
  const canvasRef = useRef();
  const experienceRef = useRef(null);
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // Solo inicializar el juego si está autenticado
    if (isAuthenticated && canvasRef.current && !experienceRef.current) {
      experienceRef.current = new Experience(canvasRef.current);
    }

    // Cleanup al desmontar
    return () => {
      if (experienceRef.current) {
        // Aquí puedes agregar cleanup si Experience tiene métodos de destrucción
        experienceRef.current = null;
      }
    };
  }, [isAuthenticated]);

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '1.2rem'
      }}>
        Cargando...
      </div>
    );
  }

  // Mostrar login si no está autenticado
  if (!isAuthenticated) {
    return <Login />;
  }

  // Mostrar el juego si está autenticado
  return (
    <>
      <LogoutButton />
      <canvas ref={canvasRef} className="webgl" />
    </>
  );
};

export default App;
