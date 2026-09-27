import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import { HandCoins, ShieldAlert, ShieldCheck, Lock, Clock } from 'lucide-react';

const RequestLoan = () => {
  const navigate = useNavigate();
  const { requestLoan, myLoans, fetchMyLoans } = useFinancial();
  const { t } = useAuth();

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [tenure, setTenure] = useState('6');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMyLoans();
  }, []);

  // Determine eligibility from actual loan records
  const hasActiveLoan = useMemo(() => {
    if (!myLoans) return false;
    return myLoans.some(l => l.status === 'approved');
  }, [myLoans]);

  const hasPendingLoan = useMemo(() => {
    if (!myLoans) return false;
    return myLoans.some(l => l.status === 'pending');
  }, [myLoans]);

  const isBlocked = hasActiveLoan || hasPendingLoan;

  const blockTitle = hasActiveLoan
    ? (t.activeLoanTitle || 'Active Loan in Progress')
    : (t.pendingLoanTitle || 'Loan Request Pending');

  const blockReason = hasActiveLoan
    ? (t.activeLoanReason || 'You already have an active loan. Please complete your current loan before requesting a new loan.')
    : (t.pendingLoanReason || 'Your loan request is pending approval. Please wait for your Group Leader to review your request.');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!amount || Number(amount) <= 0) {
      setErrorMsg('Please enter a valid loan request amount');
      return;
    }
    if (!category) {
      setErrorMsg('Please select a loan reason category');
      return;
    }

    setLoading(true);
    const res = await requestLoan(amount, category, description, tenure);
    setLoading(false);

    if (res.success) {
      setSuccessMsg(t.loanSubmitSuccess || 'Loan request successfully submitted for Leader review!');
      setAmount('');
      setCategory('');
      setDescription('');
      fetchMyLoans();
      setTimeout(() => { navigate('/member-dashboard'); }, 2000);
    } else {
      setErrorMsg(res.message || 'Failed to submit loan request');
    }
  };

  return (
    <div className="container-fluid p-0 animate-fade-in" style={{ maxWidth: '500px' }}>
      <div className="mb-4 pb-1">
        <h2 className="fw-extrabold text-brown m-0" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {t.requestLoan}
        </h2>
        <p className="text-muted small m-0">{t.applyLoan}</p>
      </div>

      {/* ── BLOCKED STATE: Active or Pending Loan ── */}
      {isBlocked ? (
        <div className="card-glass p-4 shadow-sm border border-light text-center">
          <div
            className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
            style={{
              width: 64, height: 64,
              background: hasActiveLoan ? 'var(--terracotta-danger-light, #fde8e5)' : '#fff8e7'
            }}
          >
            {hasActiveLoan
              ? <Lock size={28} style={{ color: 'var(--terracotta-danger, #c0392b)' }} />
              : <Clock size={28} style={{ color: '#d4891a' }} />}
          </div>

          <h5 className="fw-bold mb-2" style={{ color: hasActiveLoan ? 'var(--terracotta-danger, #c0392b)' : '#d4891a' }}>
            {blockTitle}
          </h5>

          <p className="text-muted mb-4" style={{ fontSize: '14px', lineHeight: 1.6 }}>
            {blockReason}
          </p>

          <button
            onClick={() => navigate('/member-dashboard')}
            className="btn btn-brown touch-btn px-4"
            style={{ borderRadius: '10px' }}
          >
            {t.backToDashboard || 'Back to Dashboard'}
          </button>
        </div>
      ) : (
        /* ── ELIGIBLE STATE: Show Request Form ── */
        <div className="card-glass p-4 shadow-sm border border-light">
          <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">

            {errorMsg && (
              <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 border-0 small"
                style={{ backgroundColor: 'var(--terracotta-danger-light, #fde8e5)', color: 'var(--terracotta-danger, #c0392b)', borderRadius: '10px' }}>
                <ShieldAlert size={16} className="flex-shrink-0" />
                <span className="fw-semibold">{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 border-0 small text-success"
                style={{ backgroundColor: 'var(--success-olive-light)', borderRadius: '10px' }}>
                <ShieldCheck size={16} className="flex-shrink-0 text-success" />
                <span className="fw-semibold">{successMsg}</span>
              </div>
            )}

            {/* Amount */}
            <div className="d-flex flex-column">
              <label className="form-label-warm">{t.amountInput}</label>
              <input
                type="number" min="1" inputMode="numeric" placeholder="e.g. 5000"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                className="form-control form-control-warm touch-input" required
              />
            </div>

            {/* Category */}
            <div className="d-flex flex-column">
              <label className="form-label-warm">{t.loanReason}</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="form-select form-control-warm touch-input" required>
                <option value="">-- {t.selectCategory} --</option>
                <option value="Medical">{t.medical}</option>
                <option value="Education">{t.education}</option>
                <option value="Agriculture">{t.agriculture}</option>
                <option value="Business">{t.business}</option>
              </select>
            </div>

            {/* Tenure */}
            <div className="d-flex flex-column">
              <label className="form-label-warm">{t.tenure}</label>
              <select value={tenure} onChange={(e) => setTenure(e.target.value)}
                className="form-select form-control-warm touch-input" required>
                <option value="3">{t.months3 || '3 Months'}</option>
                <option value="6">{t.months6 || '6 Months'}</option>
                <option value="12">{t.months12 || '12 Months'}</option>
                <option value="18">{t.months18 || '18 Months'}</option>
                <option value="24">{t.months24 || '24 Months'}</option>
              </select>
            </div>

            {/* Purpose Details */}
            <div className="d-flex flex-column">
              <label className="form-label-warm">{t.description}</label>
              <textarea rows="3"
                placeholder="Provide context for prompt leader approval..."
                value={description} onChange={(e) => setDescription(e.target.value)}
                className="form-control form-control-warm"
                style={{ borderRadius: '10px' }}
              ></textarea>
            </div>

            {/* Submit Button */}
            <button
              type="submit" disabled={loading}
              className="btn btn-brown touch-btn shadow w-100 mt-2 d-flex justify-content-center align-items-center gap-2"
            >
              {loading ? (
                <div className="spinner-border spinner-border-sm" role="status"></div>
              ) : (
                <><HandCoins size={18} /><span>{t.submitLoanApp || 'Submit Loan Application'}</span></>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default RequestLoan;
