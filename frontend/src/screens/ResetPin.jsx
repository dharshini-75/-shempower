import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Smartphone, KeyRound, ShieldCheck, ShieldAlert, Crown } from 'lucide-react';

const ResetPin = () => {
  const navigate = useNavigate();
  const { resetPin, t } = useAuth();
  const [mobileNumber, setMobileNumber] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (mobileNumber.length !== 10 || !/^\d+$/.test(mobileNumber)) {
      setErrorMsg(t.mobileLengthError || 'Mobile number must be exactly 10 digits');
      return;
    }

    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      setErrorMsg(t.pinLengthError || 'New security PIN must be exactly 4 digits');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMsg(t.pinMatchError || 'Security PIN configurations do not match');
      return;
    }

    setLoading(true);
    const res = await resetPin(mobileNumber, newPin);
    setLoading(false);

    if (res.success) {
      setSuccessMsg(t.pinResetSuccess || 'Security PIN reset successfully. Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } else {
      setErrorMsg(res.message || t.pinResetFailed || 'PIN reset failed. Please check details.');
    }
  };

  return (
    <div className="d-flex flex-column justify-content-center align-items-center min-vh-100 px-4 bg-warm-cream animate-fade-in">
      <div className="card-glass p-4.5 w-100 shadow-lg animate-scale-up" style={{ maxWidth: '420px', borderRadius: '24px' }}>
        <div className="text-center mb-4">
          <div className="mb-2 d-inline-flex align-items-center justify-content-center bg-warm-cream rounded-circle shadow-sm" style={{ width: '60px', height: '60px', border: '2px solid var(--primary-brown)' }}>
            <Crown size={24} className="text-warning" />
          </div>
          <h2 className="fw-extrabold text-brown mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>{t.appTitle}</h2>
          <p className="small text-muted fw-semibold m-0">{t.changePin} / பின்னை மீட்டமைக்கவும்</p>
        </div>

        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
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

          {/* Registered Mobile */}
          <div className="d-flex flex-column">
            <label className="form-label-warm">{t.mobileNumber}</label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0 border-warm" style={{ borderColor: 'var(--warm-border)', borderRadius: '12px 0 0 12px' }}>
                <Smartphone size={16} className="text-muted" />
              </span>
              <input 
                type="tel"
                maxLength="10"
                pattern="[0-9]{10}"
                placeholder="e.g. 9876543210"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                className="form-control form-control-warm border-start-0 touch-input"
                style={{ borderRadius: '0 12px 12px 0' }}
                required
              />
            </div>
          </div>

          {/* New PIN */}
          <div className="d-flex flex-column">
            <label className="form-label-warm">{t.newPin}</label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0 border-warm" style={{ borderColor: 'var(--warm-border)', borderRadius: '12px 0 0 12px' }}>
                <KeyRound size={16} className="text-muted" />
              </span>
              <input 
                type="password"
                maxLength="4"
                pattern="\d{4}"
                inputMode="numeric"
                placeholder="••••"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                className="form-control form-control-warm border-start-0 text-center fw-bold touch-input"
                style={{ letterSpacing: '8px', borderRadius: '0 12px 12px 0' }}
                required
              />
            </div>
          </div>

          {/* Confirm New PIN */}
          <div className="d-flex flex-column">
            <label className="form-label-warm">{t.confirmPin}</label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0 border-warm" style={{ borderColor: 'var(--warm-border)', borderRadius: '12px 0 0 12px' }}>
                <KeyRound size={16} className="text-muted" />
              </span>
              <input 
                type="password"
                maxLength="4"
                pattern="\d{4}"
                inputMode="numeric"
                placeholder="••••"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                className="form-control form-control-warm border-start-0 text-center fw-bold touch-input"
                style={{ letterSpacing: '8px', borderRadius: '0 12px 12px 0' }}
                required
              />
            </div>
          </div>

          {/* Action button */}
          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-brown touch-btn shadow w-100 mt-2"
          >
            {loading ? (
              <div className="spinner-border spinner-border-sm" role="status"></div>
            ) : (
              <span>{t.resetPinBtn}</span>
            )}
          </button>
        </form>

        <div className="text-center mt-4 pt-3 border-top border-light">
          <Link to="/login" className="text-decoration-none small fw-bold" style={{ color: 'var(--primary-brown)' }}>
            {t.haveAccount}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPin;
