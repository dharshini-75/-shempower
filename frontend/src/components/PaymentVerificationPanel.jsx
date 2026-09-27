import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, Clock, RefreshCw, AlertTriangle, User, Calendar, Eye, X, HelpCircle } from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';

/**
 * ScreenshotModal Component
 */
const ScreenshotModal = ({ src, onClose, t }) => {
  if (!src) return null;
  return (
    <div className="modal d-block" tabIndex="-1"
      style={{ backgroundColor: 'rgba(0,0,0,0.88)', zIndex: 1080 }}
      onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 500 }}
        onClick={e => e.stopPropagation()}>
        <div className="modal-content border-0" style={{ borderRadius: 16, overflow: 'hidden', background: '#1a1a1a' }}>
          <div className="d-flex align-items-center justify-content-between p-3 border-bottom border-secondary">
            <h6 className="m-0 text-white fw-semibold" style={{ fontSize: 14 }}>
              {t?.viewScreenshotLabel || 'Payment Screenshot'}
            </h6>
            <button type="button" className="btn p-0 border-0 text-white" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <div className="p-3 text-center">
            <img src={src} alt="Payment screenshot" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8, objectFit: 'contain' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Confirmation Dialog Component for Accept / Reject Actions
 */
const ConfirmationModal = ({ config, onConfirm, onCancel, language }) => {
  if (!config) return null;

  const isAccept = config.action === 'verify';
  const isTa = language === 'ta';

  const title = isAccept
    ? (isTa ? 'பணம் செலுத்துதலை ஏற்கவும்' : 'Accept Payment')
    : (isTa ? 'பணம் செலுத்துதலை நிராகரிக்கவும்' : 'Reject Payment');

  const question = isAccept
    ? (isTa ? 'இந்த பணம் செலுத்தலை ஏற்க விரும்புகிறீர்களா?' : 'Are you sure you want to accept this payment?')
    : (isTa ? 'இந்த பணம் செலுத்தலை நிராகரிக்க விரும்புகிறீர்களா?' : 'Are you sure you want to reject this payment?');

  const confirmText = isTa ? 'உறுதிப்படுத்து' : 'Confirm';
  const cancelText  = isTa ? 'ரத்து' : 'Cancel';

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 1090 }}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 420 }}>
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 20, overflow: 'hidden' }}>
          <div className="p-4 text-center">
            <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3 p-3"
              style={{ backgroundColor: isAccept ? 'rgba(26,122,53,0.1)' : 'rgba(192,57,43,0.1)' }}>
              {isAccept ? (
                <CheckCircle2 size={36} style={{ color: '#1a7a35' }} />
              ) : (
                <AlertTriangle size={36} style={{ color: '#c0392b' }} />
              )}
            </div>

            <h5 className="fw-bold mb-2" style={{ color: '#1a1a1a', fontFamily: "'Outfit', sans-serif" }}>
              {title}
            </h5>

            <p className="text-muted mb-4" style={{ fontSize: 14, lineHeight: 1.5 }}>
              {question}
            </p>

            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-light flex-grow-1 fw-bold py-2.5"
                style={{ borderRadius: 12, fontSize: 14, border: '1px solid #ddd' }}
                onClick={onCancel}
              >
                {cancelText}
              </button>
              <button
                type="button"
                className={`btn flex-grow-1 fw-bold py-2.5 text-white`}
                style={{
                  borderRadius: 12,
                  fontSize: 14,
                  backgroundColor: isAccept ? '#1a7a35' : '#c0392b',
                  border: 'none'
                }}
                onClick={() => onConfirm(config.paymentId, config.action)}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentVerificationPanel = () => {
  const { fetchPendingUpiPayments, verifyUpiPayment } = useFinancial();
  const { t, language } = useAuth();
  const isTa = language === 'ta';

  const [payments, setPayments]         = useState([]);
  const [loading, setLoading]           = useState(false);
  const [processing, setProcessing]     = useState({});
  const [feedback, setFeedback]         = useState({});
  const [viewScreenshot, setViewScreenshot] = useState(null);
  const [confirmConfig, setConfirmConfig]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await fetchPendingUpiPayments();
    setPayments(list || []);
    setLoading(false);
  }, [fetchPendingUpiPayments]);

  useEffect(() => { load(); }, [load]);

  const requestConfirmation = (paymentId, action) => {
    setConfirmConfig({ paymentId, action });
  };

  const handleConfirmedAction = async (paymentId, action) => {
    setConfirmConfig(null);
    setProcessing(prev => ({ ...prev, [paymentId]: action }));
    setFeedback(prev => ({ ...prev, [paymentId]: null }));

    const result = await verifyUpiPayment(paymentId, action);
    setProcessing(prev => { const n = { ...prev }; delete n[paymentId]; return n; });
    setFeedback(prev => ({ ...prev, [paymentId]: { ok: result.success, msg: result.message } }));

    if (result.success) {
      setTimeout(() => setPayments(prev => prev.filter(p => p.id !== paymentId)), 2500);
    }
  };

  const fmt   = (v) => `₹${Math.round(Number(v || 0)).toLocaleString('en-IN')}`;
  const fmtDt = (d) => { try { return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return d || ''; } };

  return (
    <>
      <ScreenshotModal src={viewScreenshot} onClose={() => setViewScreenshot(null)} t={t} />
      <ConfirmationModal
        config={confirmConfig}
        onConfirm={handleConfirmedAction}
        onCancel={() => setConfirmConfig(null)}
        language={language}
      />

      <div className="card-glass p-0 shadow-sm" style={{ borderRadius: 20, overflow: 'hidden' }}>

        {/* Header */}
        <div className="px-4 py-3 d-flex align-items-center justify-content-between border-bottom"
          style={{ backgroundColor: '#FDF7F2', borderColor: 'rgba(122,40,24,0.12)' }}>
          <div className="d-flex align-items-center gap-2">
            <Clock size={18} style={{ color: '#7A2818' }} />
            <h6 className="fw-bold m-0" style={{ fontFamily: "'Outfit',sans-serif", color: '#7A2818', fontSize: 15 }}>
              {isTa ? 'பணம் சரிபார்ப்பு கோரிக்கைகள்' : 'Payment Verification Requests'}
            </h6>
            {payments.length > 0 && (
              <span className="badge rounded-pill" style={{ backgroundColor: '#7A2818', fontSize: 11 }}>
                {payments.length}
              </span>
            )}
          </div>
          <button type="button" className="btn btn-sm btn-link text-muted p-0 d-flex align-items-center gap-1 text-decoration-none"
            onClick={load} disabled={loading} style={{ fontSize: 12 }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> {isTa ? 'புதுப்பி' : 'Refresh'}
          </button>
        </div>

        <div className="p-3">
          {loading && (
            <div className="text-center py-4 text-muted">
              <span className="spinner-border spinner-border-sm me-2" /> {isTa ? 'பணம் கோரிக்கைகள் ஏற்றப்படுகிறது...' : 'Loading payment requests...'}
            </div>
          )}

          {!loading && payments.length === 0 && (
            <div className="text-center py-4 text-muted">
              <CheckCircle2 size={36} className="mb-2 opacity-30" style={{ color: '#7A2818' }} />
              <p className="small fw-semibold mb-0">
                {isTa ? 'நிலுவையில் உள்ள கட்டண சரிபார்ப்புகள் எதுவும் இல்லை' : 'No pending payment verifications'}
              </p>
            </div>
          )}

          {!loading && payments.map((p) => {
            const isProcVerify = processing[p.id] === 'verify';
            const isProcReject = processing[p.id] === 'reject';
            const isAnyProc    = isProcVerify || isProcReject;
            const fb           = feedback[p.id];
            
            // Check status for absolute duplicate protection and disabling
            const isAccepted   = p.payment_status === 'SUCCESSFUL' || p.payment_status === 'ACCEPTED' || fb?.ok;
            const isRejected   = p.payment_status === 'REJECTED';
            const isProcessed  = isAccepted || isRejected;

            let statusBadge = isTa ? 'நிலுவையில்' : 'PENDING';
            let badgeBg = 'rgba(245,158,11,0.15)';
            let badgeColor = '#92400E';

            if (isAccepted) {
              statusBadge = isTa ? 'ஏற்றுக்கொள்ளப்பட்டது' : 'ACCEPTED';
              badgeBg = 'rgba(19,115,51,0.15)';
              badgeColor = '#137333';
            } else if (isRejected) {
              statusBadge = isTa ? 'நிராகரிக்கப்பட்டது' : 'REJECTED';
              badgeBg = 'rgba(194,57,43,0.15)';
              badgeColor = '#c0392b';
            }

            return (
              <div key={p.id} className="mb-3 rounded-4 border overflow-hidden"
                style={{ borderColor: 'rgba(122,40,24,0.18)', boxShadow: '0 2px 10px rgba(122,40,24,0.07)' }}>

                {/* Member info strip */}
                <div className="px-3 py-2 d-flex align-items-center gap-2"
                  style={{ backgroundColor: 'rgba(122,40,24,0.06)' }}>
                  <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{ width: 34, height: 34, backgroundColor: 'rgba(122,40,24,0.12)' }}>
                    <User size={15} style={{ color: '#7A2818' }} />
                  </div>
                  <div className="flex-grow-1">
                    <p className="m-0 fw-bold" style={{ fontSize: 14, color: '#1a1a1a' }}>
                      {p.member_name || (isTa ? 'உறுப்பினர்' : 'SHG Member')}
                    </p>
                    <p className="m-0 text-muted" style={{ fontSize: 11 }}>{p.member_mobile || ''}</p>
                  </div>
                  <span className="badge rounded-pill px-2 py-1 fw-bold"
                    style={{ backgroundColor: badgeBg, color: badgeColor, fontSize: 10 }}>
                    {statusBadge}
                  </span>
                </div>

                <div className="p-3">
                  {/* Payment details */}
                  <div className="rounded-3 p-2 mb-2" style={{ backgroundColor: '#F9F4F1' }}>
                    <div className="row g-2">
                      <div className="col-6">
                        <p className="m-0 text-muted" style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>
                          {isTa ? 'வகை' : 'Type'}
                        </p>
                        <p className="m-0 fw-semibold" style={{ fontSize: 13, color: '#333' }}>
                          {p.payment_purpose === 'SAVINGS' 
                            ? (isTa ? '💰 சேமிப்பு வைப்பு' : '💰 Savings') 
                            : (isTa ? '🔄 கடன் திருப்பிச் செலுத்துதல்' : '🔄 Loan Repayment')}
                        </p>
                      </div>
                      <div className="col-6">
                        <p className="m-0 text-muted" style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>
                          {isTa ? 'தொகை' : 'Amount'}
                        </p>
                        <p className="m-0 fw-bold" style={{ fontSize: 16, color: '#7A2818', fontFamily: "'Outfit',sans-serif" }}>
                          {fmt(p.amount)}
                        </p>
                      </div>
                      {p.payment_ref && !p.payment_ref.startsWith('SCREENSHOT-') && (
                        <div className="col-12">
                          <p className="m-0 text-muted" style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>
                            {isTa ? 'UTR / பரிவர்த்தனை எண்' : 'UTR / Reference'}
                          </p>
                          <p className="m-0 fw-semibold" style={{ fontSize: 12, fontFamily: 'monospace', color: '#333' }}>
                            {p.payment_ref}
                          </p>
                        </div>
                      )}
                      <div className="col-12 d-flex align-items-center gap-1 text-muted">
                        <Calendar size={11} />
                        <span style={{ fontSize: 11 }}>{fmtDt(p.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Screenshot */}
                  {p.screenshot ? (
                    <button type="button"
                      className="btn btn-sm w-100 mb-2 d-flex align-items-center justify-content-center gap-2 fw-semibold"
                      style={{ backgroundColor: 'rgba(122,40,24,0.08)', color: '#7A2818', border: '1px solid rgba(122,40,24,0.2)', borderRadius: 8, fontSize: 13 }}
                      onClick={() => setViewScreenshot(p.screenshot)}>
                      <Eye size={15} /> {isTa ? 'கட்டண ஸ்கிரீன்ஷாட் காண்' : 'View Payment Screenshot'}
                    </button>
                  ) : (
                    <p className="text-muted small mb-2" style={{ fontSize: 11 }}>
                      {isTa ? '⚠️ ஸ்கிரீன்ஷாட் இணைக்கப்படவில்லை' : '⚠️ No screenshot attached'}
                    </p>
                  )}

                  {/* Feedback */}
                  {fb && (
                    <div className={`alert py-1.5 px-3 mb-2 m-0 small border-0 d-flex align-items-center gap-2 ${fb.ok ? 'alert-success' : 'alert-danger'}`}
                      style={{ borderRadius: 8 }}>
                      {fb.ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                      <span>{fb.msg}</span>
                    </div>
                  )}

                  {/* Action buttons with strict disable when processed */}
                  <div className="d-flex gap-2">
                    <button type="button"
                      className="btn flex-grow-1 fw-bold d-flex align-items-center justify-content-center gap-1 text-white"
                      style={{ 
                        background: isProcessed ? '#ccc' : 'linear-gradient(135deg,#1a7a35,#22963f)', 
                        border: 'none', 
                        borderRadius: 10, 
                        fontSize: 14, 
                        minHeight: 42,
                        cursor: isProcessed ? 'not-allowed' : 'pointer'
                      }}
                      onClick={() => requestConfirmation(p.id, 'verify')}
                      disabled={isAnyProc || isProcessed}>
                      {isProcVerify 
                        ? <><span className="spinner-border spinner-border-sm" />&nbsp;{isTa ? 'ஏற்கப்படுகிறது...' : 'Accepting...'}</> 
                        : <><CheckCircle2 size={15} /> {isTa ? 'ஏற்கவும்' : 'ACCEPT'}</>}
                    </button>

                    <button type="button"
                      className="btn flex-grow-1 fw-bold d-flex align-items-center justify-content-center gap-1 text-white"
                      style={{ 
                        background: isProcessed ? '#ccc' : 'linear-gradient(135deg,#9b2226,#c0392b)', 
                        border: 'none', 
                        borderRadius: 10, 
                        fontSize: 14, 
                        minHeight: 42,
                        cursor: isProcessed ? 'not-allowed' : 'pointer'
                      }}
                      onClick={() => requestConfirmation(p.id, 'reject')}
                      disabled={isAnyProc || isProcessed}>
                      {isProcReject 
                        ? <><span className="spinner-border spinner-border-sm" />&nbsp;{isTa ? 'நிராகரிக்கப்படுகிறது...' : 'Rejecting...'}</> 
                        : <><XCircle size={15} /> {isTa ? 'நிராகரிக்கவும்' : 'REJECT'}</>}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default PaymentVerificationPanel;
