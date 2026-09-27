import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Globe, KeyRound, LogOut, ShieldCheck, ShieldAlert, CreditCard } from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();
  const { user, toggleLanguage, resetPin, updateUpiId, logout, t, language } = useAuth();
  
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [leaderUpiInput, setLeaderUpiInput] = useState(user?.upi_id || '');
  const [upiErrorMsg, setUpiErrorMsg] = useState('');
  const [upiSuccessMsg, setUpiSuccessMsg] = useState('');
  const [upiLoading, setUpiLoading] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdateUpi = async (e) => {
    e.preventDefault();
    setUpiErrorMsg('');
    setUpiSuccessMsg('');

    const cleanUpi = leaderUpiInput.trim();
    const upiPattern = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!cleanUpi || !upiPattern.test(cleanUpi) || /^\d{10}$/.test(cleanUpi)) {
      setUpiErrorMsg(t.invalidUpiFormat || 'Invalid UPI ID format. Example: name@upi');
      return;
    }

    setUpiLoading(true);
    const res = await updateUpiId(cleanUpi);
    setUpiLoading(false);

    if (res.success) {
      setUpiSuccessMsg(t.upiUpdateSuccess || 'Leader UPI ID updated successfully!');
    } else {
      setUpiErrorMsg(res.message || 'Failed to update UPI ID');
    }
  };

  const handleResetPin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      setErrorMsg(t.pinLengthError || 'New security PIN must be exactly 4 digits');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMsg(t.pinMatchError || 'Security PIN configurations do not match');
      return;
    }

    setLoading(true);
    // Since the user is already logged in, we use their mobile number directly
    const res = await resetPin(user.mobile_number, newPin);
    setLoading(false);

    if (res.success) {
      setSuccessMsg(t.pinSuccess || 'Security PIN updated successfully!');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } else {
      setErrorMsg(res.message || t.pinFailed || 'Failed to update security PIN');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/welcome');
  };

  return (
    <div className="container-fluid p-0 animate-fade-in" style={{ maxWidth: '500px' }}>
      {/* Header */}
      <div className="mb-4 pb-1">
        <h2 className="fw-extrabold text-brown m-0" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {t.settings}
        </h2>
        <p className="text-muted small m-0">{t.settingsSubtitle}</p>
      </div>

      <div className="d-flex flex-column gap-3.5">
        {/* Language Preference Card */}
        <div className="card-glass p-4 shadow-sm border border-light">
          <h5 className="fw-bold mb-3 d-flex align-items-center gap-2 text-brown" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '15px' }}>
            <Globe size={18} />
            <span>{t.languagePreference}</span>
          </h5>
          
          <div className="d-flex flex-column gap-2 p-3 bg-light rounded-3 border border-light mt-3">
            <div>
              <span className="fw-bold text-dark d-block" style={{ fontSize: '13px' }}>{t.languageName}</span>
              <span className="text-muted small d-block" style={{ fontSize: '11px', lineHeight: '1.4' }}>{t.selectLanguageDesc}</span>
            </div>
            <button 
              onClick={toggleLanguage} 
              className="btn btn-brown touch-btn w-100 mt-2 d-flex align-items-center justify-content-center gap-2"
            >
              <Globe size={16} />
              <span>{t.languageToggle}</span>
            </button>
          </div>
        </div>

        {/* Leader Payment Details Card (Leaders only) */}
        {user?.role === 'leader' && (
          <div className="card-glass p-4 shadow-sm border border-light">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2 text-brown" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '15px' }}>
              <CreditCard size={18} />
              <span>{t.paymentDetails || 'Payment Details'}</span>
            </h5>

            <form onSubmit={handleUpdateUpi} className="d-flex flex-column gap-3 mt-3">
              {upiErrorMsg && (
                <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 border-0 small" style={{ backgroundColor: 'var(--terracotta-danger-light)', color: 'var(--terracotta-danger)', borderRadius: '10px' }}>
                  <ShieldAlert size={16} className="flex-shrink-0" />
                  <span className="fw-semibold">{upiErrorMsg}</span>
                </div>
              )}

              {upiSuccessMsg && (
                <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 border-0 small text-success" style={{ backgroundColor: 'var(--success-olive-light)', borderRadius: '10px' }}>
                  <ShieldCheck size={16} className="flex-shrink-0 text-success" />
                  <span className="fw-semibold">{upiSuccessMsg}</span>
                </div>
              )}

              <div className="d-flex flex-column">
                <label className="form-label-warm">{t.upiIdLabel || 'UPI ID'}</label>
                <input 
                  type="text"
                  placeholder={t.enterUpiId || 'Enter your UPI ID (e.g. hema@oksbi)'}
                  value={leaderUpiInput}
                  onChange={(e) => setLeaderUpiInput(e.target.value)}
                  className="form-control form-control-warm touch-input"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={upiLoading}
                className="btn btn-brown touch-btn shadow w-100 mt-1"
              >
                {upiLoading ? (
                  <div className="spinner-border spinner-border-sm" role="status"></div>
                ) : (
                  <span>{t.saveUpiBtn || 'Save UPI ID'}</span>
                )}
              </button>
            </form>
          </div>
        )}



        {/* Change PIN Card */}
        <div className="card-glass p-4 shadow-sm border border-light">
          <h5 className="fw-bold mb-3 d-flex align-items-center gap-2 text-brown" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '15px' }}>
            <KeyRound size={18} />
            <span>{t.updatePin}</span>
          </h5>

          <form onSubmit={handleResetPin} className="d-flex flex-column gap-3 mt-3">
            {errorMsg && (
              <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 border-0 small" style={{ backgroundColor: 'var(--terracotta-danger-light)', color: 'var(--terracotta-danger)', borderRadius: '10px' }}>
                <ShieldAlert size={16} className="flex-shrink-0" />
                <span className="fw-semibold">{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 border-0 small text-success" style={{ backgroundColor: 'var(--success-olive-light)', borderRadius: '10px' }}>
                <ShieldCheck size={16} className="flex-shrink-0 text-success" />
                <span className="fw-semibold">{successMsg}</span>
              </div>
            )}

            {/* Current Mobile read-only metadata (Dynamic user data preserved in database format) */}
            <div className="p-2.5 px-3 rounded bg-light border border-light small text-muted text-center text-md-start">
              {t.registeredMobile}: <strong>{user?.mobile_number}</strong>
            </div>

            <div className="row g-2">
              <div className="col-6">
                <div className="d-flex flex-column">
                  <label className="form-label-warm">{t.newPin}</label>
                  <input 
                    type="password"
                    maxLength="4"
                    pattern="\d{4}"
                    inputMode="numeric"
                    placeholder="••••"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    className="form-control form-control-warm text-center fw-bold touch-input"
                    style={{ letterSpacing: '4px' }}
                    required
                  />
                </div>
              </div>

              <div className="col-6">
                <div className="d-flex flex-column">
                  <label className="form-label-warm">{t.confirmPin}</label>
                  <input 
                    type="password"
                    maxLength="4"
                    pattern="\d{4}"
                    inputMode="numeric"
                    placeholder="••••"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    className="form-control form-control-warm text-center fw-bold touch-input"
                    style={{ letterSpacing: '4px' }}
                    required
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-brown touch-btn shadow w-100 mt-2"
            >
              {loading ? (
                <div className="spinner-border spinner-border-sm" role="status"></div>
              ) : (
                <span>{t.changePin}</span>
              )}
            </button>
          </form>
        </div>

        {/* Logout session card */}
        <div className="card-glass p-4 shadow-sm border border-light">
          <h5 className="fw-bold mb-2 text-brown animate-scale-up" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '15px' }}>
            {t.sessionLogout}
          </h5>
          <p className="text-muted small mb-3">{t.logoutDesc}</p>
          <button 
            onClick={handleLogout} 
            className="btn btn-outline-danger w-100 py-3 mt-2 fw-bold d-flex align-items-center justify-content-center gap-2 border-2"
            style={{ borderRadius: '12px', border: '2px solid var(--terracotta-danger)', color: 'var(--terracotta-danger)' }}
          >
            <LogOut size={18} />
            <span>{t.logout}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
