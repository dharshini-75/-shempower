import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Login from './Login';
import logoImg from '../assets/logo.png';

const Splash = () => {
  const { token, user, loading, t } = useAuth();
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    // Exactly 2 seconds (2000ms) intro timer
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // 1. While intro is active (first 2 seconds), render SHEmpower Intro Screen
  if (showIntro) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-warm-cream animate-fade-in px-3 text-center">
        <img 
          src={logoImg} 
          alt="SHEmpower Official Logo" 
          className="mb-3 img-fluid shadow-lg animate-scale-up"
          style={{ 
            width: '120px', 
            height: '120px', 
            objectFit: 'contain',
            borderRadius: '24px',
            boxShadow: '0 10px 30px rgba(139, 94, 60, 0.2)'
          }}
        />
        <h1 className="fw-extrabold display-5 mb-2 text-brown tracking-wide animate-scale-up" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {t?.appTitle || 'SHEmpower'}
        </h1>
        <p className="text-muted small uppercase tracking-wider font-semibold animate-fade-in" style={{ letterSpacing: '3px' }}>
          {t?.tagline || 'Digital Micro-finance for Women SHGs'}
        </p>
      </div>
    );
  }

  // 2. After 2 seconds intro:
  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-warm-cream">
        <div className="spinner-border text-brown mb-3" style={{ color: 'var(--primary-brown)' }} role="status"></div>
        <span className="text-muted fw-bold uppercase tracking-wider">Syncing Session...</span>
      </div>
    );
  }

  // If already logged in, navigate to appropriate dashboard
  if (token && user) {
    return <Navigate to={user.role === 'leader' ? '/leader-dashboard' : '/member-dashboard'} replace />;
  }

  // Otherwise navigate to the existing Login Page route automatically
  return <Navigate to="/login" replace />;
};

export default Splash;


