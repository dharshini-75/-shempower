import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Copy, CheckCircle2, Phone, AlertTriangle, Image as ImageIcon, Trash2, ExternalLink, Clock } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

const UPIPaymentModal = ({
  isOpen,
  onClose,
  type,
  amount,
  mathPreview,
  onPaymentSuccess,
  onPaymentCancel,
  t: tProp,
  user,
  token
}) => {
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotName, setScreenshotName] = useState('');
  const [utrInput, setUtrInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latestPayment, setLatestPayment] = useState(null);
  const [upiLaunchError, setUpiLaunchError] = useState('');

  const fileInputRef = useRef(null);

  // Load existing payment status & reset state on open
  useEffect(() => {
    if (isOpen) {
      setScreenshot(null);
      setScreenshotName('');
      setUtrInput('');
      setErrorMsg('');
      setToastMsg('');
      setUpiLaunchError('');
      setIsSubmitting(false);
      setCopiedUpi(false);
      setCopiedPhone(false);
      fetchLatestStatus();
    }
  }, [isOpen, amount, type, token]);

  const fetchLatestStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/ledger/my-upi`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.payments) && data.payments.length > 0) {
        const sorted = [...data.payments].sort((a, b) => b.id - a.id);
        setLatestPayment(sorted[0]);
      }
    } catch (err) {
      console.warn('Could not load existing payment status:', err);
    }
  };

  if (!isOpen) return null;

  // ── Data ────────────────────────────────────────────────────────────────────
  const numAmount = Number(amount || 0);
  const leaderName = user?.assigned_leader_name || 'Group Leader';
  const leaderPhone = user?.assigned_leader_mobile || '';
  const leaderUpiId = (user?.assigned_leader_upi_id || '').trim();
  const hasUpi = leaderUpiId.includes('@');
  const isValidAmt = numAmount > 0;
  const note = type === 'savings' ? 'SHEmpower Savings' : 'SHEmpower Loan Repayment';

  // Standard UPI URI format per NPCI spec
  const upiUri = hasUpi && isValidAmt
    ? `upi://pay?pa=${encodeURIComponent(leaderUpiId)}&pn=${encodeURIComponent(leaderName)}&am=${numAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`
    : '';

  const formatCurrency = (v) => `₹${Math.round(Number(v || 0)).toLocaleString('en-IN')}`;

  // ── Copy Handlers ──────────────────────────────────────────────────────────
  const copyToClipboard = async (text, typeLabel) => {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      if (typeLabel === 'upi') {
        setCopiedUpi(true);
        setTimeout(() => setCopiedUpi(false), 2500);
      } else {
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2500);
      }
      showToast(`${typeLabel === 'upi' ? 'UPI ID' : 'Phone number'} copied`);
    } catch (e) {
      showToast('Failed to copy to clipboard');
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  // ── UPI App Launcher ───────────────────────────────────────────────────────
  const handleOpenUpiApp = async () => {
    if (!upiUri) return;
    setUpiLaunchError('');
    try {
      if (window.Capacitor?.isNativePlatform?.() && window.Capacitor?.Plugins?.UpiIntent) {
        const res = await window.Capacitor.Plugins.UpiIntent.launch({ url: upiUri });
        if (res && res.error) {
          setUpiLaunchError(res.error);
        }
      } else {
        window.location.href = upiUri;
      }
    } catch (err) {
      console.warn('Error launching UPI app:', err);
      setUpiLaunchError('Could not launch external UPI app. Please scan the QR code using GPay or PhonePe.');
    }
  };

  // ── Screenshot Upload ──────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG or PNG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Screenshot file size must be under 5 MB.');
      return;
    }
    setErrorMsg('');
    setScreenshotName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => setScreenshot(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveScreenshot = () => {
    setScreenshot(null);
    setScreenshotName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ── Submit Payment ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!isValidAmt) {
      setErrorMsg('Please enter a valid payment amount.');
      return;
    }
    if (!screenshot) {
      setErrorMsg('Please upload your payment screenshot before submitting.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/ledger/submit-upi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: numAmount,
          payment_purpose: type === 'savings' ? 'SAVINGS' : 'LOAN_REPAYMENT',
          payment_ref: utrInput.trim() || undefined,
          screenshot
        })
      });
      const data = await res.json();

      if (data.success) {
        showToast('Payment submitted for Leader verification.');
        setLatestPayment(data.payment || {
          payment_status: 'PENDING_VERIFICATION',
          amount: numAmount,
          payment_purpose: type === 'savings' ? 'SAVINGS' : 'LOAN_REPAYMENT',
          created_at: new Date().toISOString()
        });
        if (onPaymentSuccess) {
          onPaymentSuccess({ amount: numAmount, type, status: 'PENDING_VERIFICATION' });
        }
      } else {
        setErrorMsg(data.message || 'Submission failed. Please try again.');
      }
    } catch (err) {
      setErrorMsg('Network error. Check your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Color & Style Palette
  const PRIMARY = '#7A2818';

  return (
    <div
      data-upi-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1060,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Toast Banner */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1100,
            backgroundColor: '#111827',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: '24px',
            fontSize: '13px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            pointerEvents: 'none'
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* ── 1. HEADER ────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid #E5E7EB',
          backgroundColor: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}
      >
        <button
          data-back-btn="true"
          onClick={() => {
            if (onPaymentCancel) onPaymentCancel();
            onClose();
          }}
          disabled={isSubmitting}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px 12px 8px 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#111827',
            fontSize: '15px',
            fontWeight: '600'
          }}
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <span
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: '17px',
            fontWeight: '700',
            color: '#111827',
            marginRight: '40px'
          }}
        >
          Payment
        </span>
      </div>

      {/* ── MAIN SCROLL CONTENT ────────────────────────────────────────────── */}
      <div
        style={{
          padding: '24px 20px 120px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          maxWidth: '500px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        {/* ── 2. LEADER DETAILS ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: '700',
              color: '#374151',
              letterSpacing: '0.02em',
              textTransform: 'uppercase'
            }}
          >
            Pay to Leader
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>Leader Name</span>
            <span style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>{leaderName}</span>
          </div>

          {/* UPI ID Row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>UPI ID</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <span
                style={{
                  fontSize: '15px',
                  fontFamily: 'monospace',
                  fontWeight: '600',
                  color: '#111827',
                  wordBreak: 'break-all',
                  flex: 1
                }}
              >
                {leaderUpiId || 'Not provided'}
              </span>
              {leaderUpiId && (
                <button
                  onClick={() => copyToClipboard(leaderUpiId, 'upi')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: copiedUpi ? '#F0FDF4' : '#F9FAFB',
                    color: copiedUpi ? '#166534' : PRIMARY,
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    minHeight: '38px',
                    flexShrink: 0
                  }}
                >
                  {copiedUpi ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                  <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>
            {copiedUpi && (
              <span style={{ fontSize: '12px', color: '#166534', fontWeight: '500', marginTop: '2px' }}>
                UPI ID copied
              </span>
            )}
          </div>

          {/* Phone Number Row */}
          {leaderPhone && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>Phone Number</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ fontSize: '15px', fontFamily: 'monospace', fontWeight: '600', color: '#111827' }}>
                  {leaderPhone}
                </span>
                <button
                  onClick={() => copyToClipboard(leaderPhone, 'phone')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: copiedPhone ? '#F0FDF4' : '#F9FAFB',
                    color: copiedPhone ? '#166534' : PRIMARY,
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    minHeight: '38px',
                    flexShrink: 0
                  }}
                >
                  {copiedPhone ? <CheckCircle2 size={15} /> : <Phone size={15} />}
                  <span>{copiedPhone ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              {copiedPhone && (
                <span style={{ fontSize: '12px', color: '#166534', fontWeight: '500', marginTop: '2px' }}>
                  Phone number copied
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ height: '1px', backgroundColor: '#E5E7EB', margin: '4px 0' }} />

        {/* ── 3. PAYMENT AMOUNT ────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>
            {type === 'savings' ? 'Savings Deposit Amount' : 'Loan Repayment Amount'}
          </span>
          <span
            style={{
              fontSize: '38px',
              fontWeight: '800',
              color: '#111827',
              letterSpacing: '-0.02em',
              lineHeight: 1.1
            }}
          >
            {formatCurrency(numAmount)}
          </span>
        </div>

        {/* ── 4. QR CODE & OPEN UPI APP ──────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#111827' }}>
            Scan to Pay
          </p>

          {!hasUpi || !isValidAmt ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 16px',
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: '10px',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <AlertTriangle size={18} style={{ color: '#D97706', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '13px', color: '#92400E', lineHeight: '1.4' }}>
                {!hasUpi
                  ? 'Group Leader UPI ID is missing. Please contact your Leader.'
                  : 'Please enter a valid amount greater than ₹0.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#ffffff',
                  border: '2px solid #E5E7EB',
                  borderRadius: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  lineHeight: 0
                }}
              >
                <QRCodeSVG
                  value={upiUri}
                  size={220}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="H"
                  marginSize={1}
                />
              </div>
              <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500', textAlign: 'center' }}>
                Scan this QR using any UPI app
              </span>
            </div>
          )}

          {hasUpi && isValidAmt && (
            <button
              onClick={handleOpenUpiApp}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '14px 20px',
                borderRadius: '10px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#F9FAFB',
                color: '#111827',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                minHeight: '48px'
              }}
            >
              <ExternalLink size={18} />
              <span>Open UPI App</span>
            </button>
          )}

          {upiLaunchError && (
            <span style={{ fontSize: '12px', color: '#DC2626', textAlign: 'center', lineHeight: '1.4' }}>
              {upiLaunchError}
            </span>
          )}
        </div>

        <div style={{ height: '1px', backgroundColor: '#E5E7EB', margin: '4px 0' }} />

        {/* ── 5. PAYMENT INSTRUCTIONS & VERIFICATION UPLOAD ───────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '700', color: '#111827' }}>
              Payment Verification
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#4B5563', lineHeight: '1.5' }}>
              Pay using any UPI app.
              <br />
              After payment, return here and upload your payment screenshot.
            </p>
          </div>

          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '14px 20px',
              borderRadius: '10px',
              border: `2px dashed ${screenshot ? '#166534' : '#9CA3AF'}`,
              backgroundColor: screenshot ? '#F0FDF4' : '#F9FAFB',
              color: screenshot ? '#166534' : '#374151',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              minHeight: '48px'
            }}
          >
            <ImageIcon size={18} />
            <span>{screenshot ? 'Change Screenshot' : 'Upload Screenshot'}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {/* Screenshot Preview */}
          {screenshot && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                backgroundColor: '#F9FAFB'
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                Screenshot Preview
              </span>
              <img
                src={screenshot}
                alt="Screenshot Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '220px',
                  borderRadius: '8px',
                  objectFit: 'contain',
                  border: '1px solid #D1D5DB'
                }}
              />
              <button
                onClick={handleRemoveScreenshot}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #FCA5A5',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  minHeight: '38px'
                }}
              >
                <Trash2 size={16} />
                <span>Remove</span>
              </button>
            </div>
          )}

          {/* Optional Reference Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>
              UTR / Transaction Ref <span style={{ color: '#9CA3AF' }}>(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 506812345678"
              value={utrInput}
              onChange={(e) => setUtrInput(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '14px',
                fontFamily: 'monospace',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                outline: 'none',
                backgroundColor: '#ffffff',
                color: '#111827',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Validation / Error Alert */}
          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px'
              }}
            >
              <AlertTriangle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#DC2626', fontWeight: '500' }}>{errorMsg}</span>
            </div>
          )}

          {/* ── 6. SUBMIT PAYMENT BUTTON ───────────────────────────────────── */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !screenshot}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: isSubmitting || !screenshot ? '#D1D5DB' : PRIMARY,
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: '700',
              cursor: isSubmitting || !screenshot ? 'not-allowed' : 'pointer',
              minHeight: '52px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: isSubmitting || !screenshot ? 'none' : '0 2px 6px rgba(122, 40, 24, 0.25)',
              marginTop: '8px'
            }}
          >
            {isSubmitting ? (
              <>
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.8s linear infinite'
                  }}
                />
                <span>Submitting...</span>
              </>
            ) : (
              <span>Submit Payment</span>
            )}
          </button>
        </div>

        <div style={{ height: '1px', backgroundColor: '#E5E7EB', margin: '4px 0' }} />

        {/* ── 7. PAYMENT STATUS SECTION ───────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#111827' }}>
            Payment Status
          </h3>

          {!latestPayment ? (
            <div
              style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <Clock size={18} style={{ color: '#6B7280' }} />
              <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>
                No recent payment submitted yet.
              </span>
            </div>
          ) : (
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor:
                  latestPayment.payment_status === 'SUCCESSFUL' || latestPayment.payment_status === 'ACCEPTED'
                    ? '#F0FDF4'
                    : latestPayment.payment_status === 'REJECTED'
                    ? '#FEF2F2'
                    : '#FFFBEB',
                border: `1px solid ${
                  latestPayment.payment_status === 'SUCCESSFUL' || latestPayment.payment_status === 'ACCEPTED'
                    ? '#BBF7D0'
                    : latestPayment.payment_status === 'REJECTED'
                    ? '#FECACA'
                    : '#FDE68A'
                }`,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color:
                      latestPayment.payment_status === 'SUCCESSFUL' || latestPayment.payment_status === 'ACCEPTED'
                        ? '#166534'
                        : latestPayment.payment_status === 'REJECTED'
                        ? '#991B1B'
                        : '#92400E'
                  }}
                >
                  {latestPayment.payment_status === 'SUCCESSFUL' || latestPayment.payment_status === 'ACCEPTED'
                    ? 'Payment accepted'
                    : latestPayment.payment_status === 'REJECTED'
                    ? 'Payment rejected'
                    : 'Payment verification pending'}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    textTransform: 'uppercase',
                    backgroundColor:
                      latestPayment.payment_status === 'SUCCESSFUL' || latestPayment.payment_status === 'ACCEPTED'
                        ? '#DCFCE7'
                        : latestPayment.payment_status === 'REJECTED'
                        ? '#FEE2E2'
                        : '#FEF3C7',
                    color:
                      latestPayment.payment_status === 'SUCCESSFUL' || latestPayment.payment_status === 'ACCEPTED'
                        ? '#15803D'
                        : latestPayment.payment_status === 'REJECTED'
                        ? '#B91C1C'
                        : '#B45309'
                  }}
                >
                  {latestPayment.payment_status === 'SUCCESSFUL' || latestPayment.payment_status === 'ACCEPTED'
                    ? 'ACCEPTED'
                    : latestPayment.payment_status === 'REJECTED'
                    ? 'REJECTED'
                    : 'PENDING'}
                </span>
              </div>

              <p style={{ margin: 0, fontSize: '13px', color: '#4B5563', lineHeight: '1.4' }}>
                {latestPayment.payment_status === 'SUCCESSFUL' || latestPayment.payment_status === 'ACCEPTED'
                  ? 'Your payment has been verified by Leader.'
                  : latestPayment.payment_status === 'REJECTED'
                  ? 'Your payment was rejected by Leader.'
                  : 'Waiting for Leader approval.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default UPIPaymentModal;
