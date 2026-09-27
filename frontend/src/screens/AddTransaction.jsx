import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, ShieldAlert, ShieldCheck } from 'lucide-react';

const AddTransaction = () => {
  const navigate = useNavigate();
  const { members, fetchMembers, getMathPreview, addTransaction } = useFinancial();
  const { t } = useAuth();

  const [selectedMember, setSelectedMember] = useState('');
  const [transactionType, setTransactionType] = useState('deposit'); // 'deposit' or 'repayment'
  const [amount, setAmount] = useState('');
  
  // Math preview state
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  // Fetch math engine preview on amount or member change
  useEffect(() => {
    const loadPreview = async () => {
      setPreview(null);
      setPreviewError('');
      if (!selectedMember || !amount || Number(amount) <= 0 || transactionType !== 'repayment') {
        return;
      }

      setPreviewLoading(true);
      try {
        const res = await getMathPreview(selectedMember, amount);
        if (res && res.success) {
          setPreview(res);
        } else {
          setPreviewError(res?.message || 'Failed to calculate math preview');
        }
      } catch (e) {
        setPreviewError('Error calculating preview');
      } finally {
        setPreviewLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      loadPreview();
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [selectedMember, amount, transactionType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedMember) {
      setErrorMsg('Please select an SHG member');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setErrorMsg('Please enter a valid amount');
      return;
    }

    setLoading(true);
    const res = await addTransaction(selectedMember, transactionType, amount);
    setLoading(false);

    if (res.success) {
      setSuccessMsg('Transaction successfully written to Digital Passbook!');
      setAmount('');
      setPreview(null);
      setTimeout(() => {
        navigate('/leader-dashboard');
      }, 2000);
    } else {
      setErrorMsg(res.message || 'Failed to record transaction');
    }
  };

  const formatCur = (num) => `₹${Math.round(Number(num || 0)).toLocaleString('en-IN')}`;

  return (
    <div className="container-fluid p-0 animate-fade-in" style={{ maxWidth: '500px' }}>
      <div className="mb-4 pb-1">
        <h2 className="fw-extrabold text-brown m-0" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {t.addEntry}
        </h2>
        <p className="text-muted small m-0">Record savings deposits or loan interest repayments into passbook</p>
      </div>

      <div className="card-glass p-4 shadow-sm border border-light">
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

          {/* Member Selection */}
          <div className="d-flex flex-column">
            <label className="form-label-warm">Select SHG Member</label>
            <select 
              value={selectedMember}
              onChange={(e) => {
                setSelectedMember(e.target.value);
                setPreview(null);
              }}
              className="form-select form-control-warm touch-input"
              required
            >
              <option value="">-- Choose Member --</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.mobile_number}) - Loan: {formatCur(m.outstanding_loan)}
                </option>
              ))}
            </select>
          </div>

          {/* Transaction Type Selection (Modern Touch Cards) */}
          <div className="d-flex flex-column">
            <label className="form-label-warm">Transaction Type</label>
            <div className="row g-2">
              <div className="col-6">
                <div 
                  onClick={() => {
                    setTransactionType('deposit');
                    setPreview(null);
                  }}
                  className="p-2.5 rounded-3 text-center border d-flex flex-column align-items-center justify-content-center gap-1"
                  style={{
                    cursor: 'pointer',
                    backgroundColor: transactionType === 'deposit' ? 'var(--primary-brown-light)' : '#ffffff',
                    borderColor: transactionType === 'deposit' ? 'var(--primary-brown)' : 'var(--warm-border)',
                    borderWidth: '2px',
                    borderRadius: '12px',
                    transition: 'all 0.2s ease',
                    boxShadow: transactionType === 'deposit' ? 'var(--shadow-sm)' : 'none'
                  }}
                >
                  <span style={{ fontSize: '18px' }}>💰</span>
                  <span className="fw-bold text-dark" style={{ fontSize: '11px' }}>
                    Deposit (Savings)
                  </span>
                </div>
              </div>

              <div className="col-6">
                <div 
                  onClick={() => setTransactionType('repayment')}
                  className="p-2.5 rounded-3 text-center border d-flex flex-column align-items-center justify-content-center gap-1"
                  style={{
                    cursor: 'pointer',
                    backgroundColor: transactionType === 'repayment' ? 'var(--primary-brown-light)' : '#ffffff',
                    borderColor: transactionType === 'repayment' ? 'var(--primary-brown)' : 'var(--warm-border)',
                    borderWidth: '2px',
                    borderRadius: '12px',
                    transition: 'all 0.2s ease',
                    boxShadow: transactionType === 'repayment' ? 'var(--shadow-sm)' : 'none'
                  }}
                >
                  <span style={{ fontSize: '18px' }}>📉</span>
                  <span className="fw-bold text-dark" style={{ fontSize: '11px' }}>
                    Repayment (Loan)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="d-flex flex-column">
            <label className="form-label-warm">{t.amountInput}</label>
            <input 
              type="number"
              min="1"
              inputMode="numeric"
              placeholder="e.g. 500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="form-control form-control-warm touch-input"
              required
            />
          </div>

          {/* Live Math Preview for Repayments */}
          {transactionType === 'repayment' && selectedMember && amount && Number(amount) > 0 && (
            <div className="p-3 rounded-3 border border-light bg-light shadow-sm animate-scale-up">
              <div className="small fw-bold text-brown uppercase mb-2" style={{ color: 'var(--primary-brown)', fontSize: '11px', letterSpacing: '0.5px' }}>
                {t.liveMathPreview} (Reducing balance 2%)
              </div>

              {previewLoading && (
                <div className="text-center py-2">
                  <div className="spinner-border spinner-border-sm text-brown" role="status"></div>
                </div>
              )}

              {previewError && (
                <div className="text-danger small py-1">⚠️ {previewError}</div>
              )}

              {preview && (
                <div className="d-flex flex-column gap-1.5" style={{ fontSize: '12px' }}>
                  <div className="d-flex justify-content-between text-muted border-bottom border-light pb-1.5">
                    <span>{t.remainingBalance || 'Opening Balance'}</span>
                    <strong className="text-dark">{formatCur(preview.currentBalance)}</strong>
                  </div>

                  <div className="d-flex justify-content-between text-muted border-bottom border-light pb-1.5">
                    <span>{t.vattiLabel || 'Interest Paid'} (2%)</span>
                    <strong className="text-danger">{formatCur(preview.vattiPaid)}</strong>
                  </div>

                  <div className="d-flex justify-content-between text-muted border-bottom border-light pb-1.5">
                    <span>{t.asalLabel || 'Principal Paid'}</span>
                    <strong className="text-success">{formatCur(preview.asalPaid)}</strong>
                  </div>

                  <div className="d-flex justify-content-between text-muted pt-1 fw-bold">
                    <span>{t.newLoanBalance || 'New Balance'}</span>
                    <strong className="text-brown">{formatCur(preview.newBalance)}</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-brown touch-btn shadow w-100 mt-2 d-flex justify-content-center align-items-center gap-2"
          >
            {loading ? (
              <div className="spinner-border spinner-border-sm" role="status"></div>
            ) : (
              <>
                <PlusCircle size={18} />
                <span>{t.submit}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddTransaction;
