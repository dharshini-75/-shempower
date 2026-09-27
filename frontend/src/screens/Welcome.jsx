import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Globe, ShieldCheck, Crown } from 'lucide-react';

import logoImg from '../assets/logo.png';

const Welcome = () => {
  const navigate = useNavigate();
  const { toggleLanguage, t } = useAuth();

  return (
    <div className="d-flex flex-column justify-content-center align-items-center min-vh-100 px-4 bg-warm-cream animate-fade-in">
      {/* Top Floating Language Toggle */}
      <div className="position-absolute top-0 end-0 p-3">
        <button 
          onClick={toggleLanguage} 
          className="btn btn-outline-brown d-flex align-items-center gap-2 shadow-sm bg-white"
          style={{ borderRadius: '12px', padding: '8px 16px', fontSize: '13px' }}
        >
          <Globe size={16} />
          <strong>{t.languageToggle}</strong>
        </button>
      </div>

      <div className="card-glass text-center w-100 py-5 px-4 max-w-md animate-scale-up" style={{ maxWidth: '420px' }}>
        {/* Official SHEmpower Logo */}
        <img 
          src={logoImg} 
          alt="SHEmpower Logo" 
          className="mx-auto mb-3 img-fluid shadow-sm"
          style={{ width: '110px', height: '110px', objectFit: 'contain', borderRadius: '22px' }}
        />

        <h1 className="display-6 mb-2 fw-extrabold text-brown" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {t.appTitle}
        </h1>
        <p className="lead text-muted fs-6 mb-4 fw-semibold tracking-wide">
          {t.tagline}
        </p>

        {/* Informative Value Cards */}
        <div className="bg-light p-3.5 rounded-3 mb-4 text-start border border-light" style={{ fontSize: '13px', borderRadius: '12px' }}>
          <div className="d-flex align-items-center gap-2 mb-2">
            <ShieldCheck size={18} className="text-success" />
            <strong className="text-dark">{t.safeManagement || '100% Safe SHG Management'}</strong>
          </div>
          <div className="text-muted" style={{ lineHeight: '1.4' }}>
            {t.safeDesc || 'Direct secure login with 10-digit mobile and 4-digit PIN. No complex group ID or OTP requirements.'}
          </div>
        </div>

        <div className="d-grid gap-3">
          <button 
            onClick={() => navigate('/login')} 
            className="btn btn-brown touch-btn fs-6 shadow"
          >
            {t.loginBtn}
          </button>
          
          <button 
            onClick={() => navigate('/register')} 
            className="btn btn-outline-brown touch-btn fs-6"
          >
            {t.registerBtn}
          </button>
        </div>
      </div>

      <div className="text-muted mt-5 text-center small" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
        Antigravity Web Engine &copy; 2026. Made for women empowerment.
      </div>
    </div>
  );
};

export default Welcome;
