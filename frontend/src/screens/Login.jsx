import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Smartphone, KeyRound, ShieldAlert } from 'lucide-react';

import logoImg from '../assets/logo.png';

const Login = () => {
  const navigate = useNavigate();
  const { login, logout, t, user, token } = useAuth();
  const safeT = t || {
    appTitle: 'SHEmpower',
    tagline: 'Digital Micro-finance for Women SHGs',
    roleLeader: 'Group Leader (Thalaivi)',
    roleMember: 'Group Member',
    mobileNumber: '10-Digit Mobile Number',
    securityPin: '4-Digit Security PIN',
    forgotPin: 'Forgot Security PIN? Reset here',
    loginBtn: 'Secure Login',
    noAccount: "Don't have an account? Register"
  };

  const [role, setRole] = useState('member');
  const [mobileNumber, setMobileNumber] = useState('');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const didNavigate = useRef(false);

  // Navigate after successful login — fires AFTER React commits user+token state
  useEffect(() => {
    if (user && token && !didNavigate.current) {
      didNavigate.current = true;
      if (user.role === 'leader') {
        navigate('/leader-dashboard', { replace: true });
      } else {
        navigate('/member-dashboard', { replace: true });
      }
    }
  }, [user, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    didNavigate.current = false;

    if (mobileNumber.length !== 10 || !/^\d+$/.test(mobileNumber)) {
      setErrorMsg(safeT.mobileLengthError || 'Mobile number must be exactly 10 digits');
      return;
    }
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      setErrorMsg(safeT.pinLengthError || 'Security PIN must be exactly 4 digits');
      return;
    }

    setLoading(true);
    const res = await login(mobileNumber, pin);
    setLoading(false);

    if (res && res.success) {
      const activeUser = res.user || user;
      const roleToUse = activeUser?.role || role;
      const targetPath = roleToUse === 'leader' ? '/leader-dashboard' : '/member-dashboard';
      navigate(targetPath, { replace: true });
      window.location.hash = '#' + targetPath;
    } else {
      setErrorMsg(res?.message || safeT.loginFailed || 'Invalid login details. Please check your credentials.');
    }
  };

  return (
    <div className="auth-page-wrap animate-fade-in">
      <div className="auth-card animate-scale-up">

        {/* Header */}
        <div className="auth-header text-center">
          <img 
            src={logoImg} 
            alt="SHEmpower Logo" 
            className="mx-auto mb-2 img-fluid shadow-sm"
            style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '18px' }}
          />
          <h1 className="auth-title">{safeT.appTitle}</h1>
          <p className="auth-subtitle">{safeT.tagline}</p>
        </div>

        {/* Role Selector */}
        <div className="role-selector-row">
          <button
            type="button"
            onClick={() => setRole('leader')}
            className={`role-chip ${role === 'leader' ? 'role-chip--active' : ''}`}
          >
            <span className="role-chip-icon">👑</span>
            <span className="role-chip-label">{safeT.roleLeader}</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('member')}
            className={`role-chip ${role === 'member' ? 'role-chip--active' : ''}`}
          >
            <span className="role-chip-icon">👩🏽‍🌾</span>
            <span className="role-chip-label">{safeT.roleMember}</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {errorMsg && (
            <div className="auth-error-banner">
              <ShieldAlert size={15} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">{safeT.mobileNumber}</label>
            <div className="auth-input-wrap">
              <Smartphone size={16} className="auth-input-icon" />
              <input
                type="tel" maxLength="10" pattern="[0-9]{10}"
                placeholder={safeT.enterMobile || '10-digit mobile number'}
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                className="auth-input"
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <div className="d-flex justify-content-between align-items-center">
              <label className="auth-label">{safeT.securityPin}</label>
              <Link to="/reset-pin" className="auth-link-small">{safeT.forgotPin}</Link>
            </div>
            <div className="auth-input-wrap">
              <KeyRound size={16} className="auth-input-icon" />
              <input
                type="password" maxLength="4" pattern="\d{4}" inputMode="numeric"
                placeholder={safeT.confirm4Pin || '4-digit PIN'}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="auth-input auth-pin-input"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-brown touch-btn w-100 mt-1">
            {loading
              ? <div className="spinner-border spinner-border-sm" role="status" />
              : <span>{safeT.loginBtn}</span>
            }
          </button>
        </form>

        {/* Register link */}
        <div className="auth-footer-link">
          <Link to="/register" className="auth-link">{safeT.noAccount}</Link>
        </div>

      </div>
    </div>
  );
};

export default Login;
