import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import { User, Smartphone, KeyRound, ShieldAlert, Crown, Users, CreditCard } from 'lucide-react';

import logoImg from '../assets/logo.png';

const Register = () => {
  const navigate = useNavigate();
  const { register, t } = useAuth();
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [upiId, setUpiId] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [role, setRole] = useState('member');
  const [leaders, setLeaders] = useState([]);
  const [selectedLeaderId, setSelectedLeaderId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const res = await fetch(API_BASE_URL + '/api/auth/leaders');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.leaders)) {
            setLeaders(data.leaders);
            if (data.leaders.length > 0) {
              setSelectedLeaderId(String(data.leaders[0].id));
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch group leaders:', err);
      }
    };
    fetchLeaders();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (fullName.trim().length < 3) {
      setErrorMsg(t.nameLengthError || 'Full name must be at least 3 characters');
      return;
    }
    if (mobileNumber.length !== 10 || !/^\d+$/.test(mobileNumber)) {
      setErrorMsg(t.mobileLengthError || 'Mobile number must be exactly 10 digits');
      return;
    }
    if (role === 'member' && !selectedLeaderId) {
      setErrorMsg(t.selectLeaderError || 'Please select your Group Leader');
      return;
    }

    if (role === 'leader') {
      const cleanUpi = upiId.trim();
      const upiPattern = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
      if (!cleanUpi) {
        setErrorMsg(t.upiRequiredForLeader || 'UPI ID is required for Group Leader registration.');
        return;
      }
      if (!upiPattern.test(cleanUpi) || /^\d{10}$/.test(cleanUpi)) {
        setErrorMsg(t.invalidUpiFormat || 'Invalid UPI ID format. Example: name@upi');
        return;
      }
    }

    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      setErrorMsg(t.pinLengthError || 'Security PIN must be exactly 4 digits');
      return;
    }
    if (pin !== confirmPin) {
      setErrorMsg(t.pinsDoNotMatch || 'Security PINs do not match');
      return;
    }

    setLoading(true);
    const res = await register(
      fullName, 
      mobileNumber, 
      pin, 
      role, 
      role === 'member' ? Number(selectedLeaderId) : null,
      role === 'leader' ? upiId.trim() : null
    );
    setLoading(false);

    if (res.success) {
      navigate(res.user.role === 'leader' ? '/leader-dashboard' : '/member-dashboard');
    } else {
      setErrorMsg(res.message || t.regFailed || 'Registration failed. Please check your details.');
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
          <h1 className="auth-title">{t.appTitle}</h1>
          <p className="auth-subtitle">{t.createYourAccount || 'Create your account'}</p>
        </div>

        {/* Role Selector */}
        <div className="role-selector-row">
          <button
            type="button"
            onClick={() => setRole('leader')}
            className={`role-chip ${role === 'leader' ? 'role-chip--active' : ''}`}
          >
            <span className="role-chip-icon">👑</span>
            <span className="role-chip-label">{t.roleLeader}</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('member')}
            className={`role-chip ${role === 'member' ? 'role-chip--active' : ''}`}
          >
            <span className="role-chip-icon">👩🏽‍🌾</span>
            <span className="role-chip-label">{t.roleMember}</span>
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

          {/* Full Name */}
          <div className="auth-field">
            <label className="auth-label">{t.fullName}</label>
            <div className="auth-input-wrap">
              <User size={16} className="auth-input-icon" />
              <input
                type="text" placeholder={t.enterFullName || "e.g. Anjali Devi"}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="auth-input"
                required
              />
            </div>
          </div>

          {/* Mobile Number */}
          <div className="auth-field">
            <label className="auth-label">{t.mobileNumber}</label>
            <div className="auth-input-wrap">
              <Smartphone size={16} className="auth-input-icon" />
              <input
                type="tel" maxLength="10" pattern="[0-9]{10}"
                placeholder={t.enterMobile || "10-digit mobile number"}
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                className="auth-input"
                required
              />
            </div>
          </div>

          {/* UPI ID (Leaders only) */}
          {role === 'leader' && (
            <div className="auth-field">
              <label className="auth-label">
                {t.upiIdLabel || 'UPI ID'} <span className="text-danger">*</span>
              </label>
              <div className="auth-input-wrap">
                <CreditCard size={16} className="auth-input-icon" />
                <input
                  type="text"
                  placeholder={t.enterUpiId || 'Enter your UPI ID (e.g. hema@oksbi)'}
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="auth-input"
                  required
                />
              </div>
            </div>
          )}

          {/* Group Leader (members only) */}
          {role === 'member' && (
            <div className="auth-field">
              <label className="auth-label">
                {t.groupLeader || 'Group Leader'} <span className="text-danger">*</span>
              </label>
              <div className="auth-input-wrap">
                <Users size={16} className="auth-input-icon" />
                <select
                  value={selectedLeaderId}
                  onChange={(e) => setSelectedLeaderId(e.target.value)}
                  className="auth-input auth-select"
                  required
                >
                  {leaders.length === 0
                    ? <option value="">{t.noLeadersAvailable || 'No leaders available'}</option>
                    : leaders.map(l => (
                        <option key={l.id} value={l.id}>
                          👑 {l.full_name} ({l.mobile_number})
                        </option>
                      ))
                  }
                </select>
              </div>
            </div>
          )}

          {/* PIN */}
          <div className="auth-field">
            <label className="auth-label">{t.securityPin}</label>
            <div className="auth-input-wrap">
              <KeyRound size={16} className="auth-input-icon" />
              <input
                type="password" maxLength="4" pattern="\d{4}" inputMode="numeric"
                placeholder={t.createPin || "Create 4-digit PIN"}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="auth-input auth-pin-input"
                required
              />
            </div>
          </div>

          {/* Confirm PIN */}
          <div className="auth-field">
            <label className="auth-label">{t.confirmPin}</label>
            <div className="auth-input-wrap">
              <KeyRound size={16} className="auth-input-icon" />
              <input
                type="password" maxLength="4" pattern="\d{4}" inputMode="numeric"
                placeholder={t.confirm4Pin || "Confirm 4-digit PIN"}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                className="auth-input auth-pin-input"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-brown touch-btn w-100 mt-1">
            {loading
              ? <div className="spinner-border spinner-border-sm" role="status" />
              : <span>{t.registerBtn}</span>
            }
          </button>
        </form>

        {/* Login link */}
        <div className="auth-footer-link">
          <Link to="/login" className="auth-link">{t.haveAccount}</Link>
        </div>

      </div>
    </div>
  );
};

export default Register;
