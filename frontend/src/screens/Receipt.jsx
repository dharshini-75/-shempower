import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import { Printer, Share2, ArrowLeft, ShieldCheck } from 'lucide-react';

const Receipt = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user, t } = useAuth();
  
  const [entry, setEntry] = useState(null);
  const [memberName, setMemberName] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchReceiptDetails = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const res = await fetch(API_BASE_URL + '/api/ledger/passbook', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const json = await res.json();
        if (json.success) {
          const match = json.ledger.find(e => e.id === Number(id));
          if (match) {
            setEntry(match);
            setMemberName(match.member_name || 'Group Member');
          } else {
            setErrorMsg('Transaction receipt not found in passbook records');
          }
        } else {
          setErrorMsg(json.message || 'Failed to query transaction log');
        }
      } catch (e) {
        setErrorMsg('Error connecting to the backend server');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchReceiptDetails();
    }
  }, [id, token]);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    if (!entry) return;
    const formatCurVal = (num) => `Rs ${Math.round(Number(num || 0)).toLocaleString('en-IN')}`;
    
    const message = `*SHEmpower Digital Receipt*
---------------------------------------
*Receipt ID:* SHG-TXN-${entry.id}
*Date:* ${new Date(entry.transaction_date).toLocaleDateString('en-IN')}
*Member Name:* ${memberName}
*Transaction Type:* ${entry.transaction_type.toUpperCase()}
*Asal (Principal):* ${formatCurVal(entry.asal_amount)}
*Vatti (Interest):* ${formatCurVal(entry.vatti_amount)}
*Total Paid:* ${formatCurVal(entry.total_paid)}
*Remaining Balance:* ${formatCurVal(entry.remaining_balance)}
---------------------------------------
Thank you for your timely SHG contribution!`;

    const encodedMsg = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encodedMsg}`, '_blank');
  };

  const formatCur = (num) => `₹${Math.round(Number(num || 0)).toLocaleString('en-IN')}`;

  if (loading) {
    return (
      <div className="text-center py-5 animate-fade-in">
        <div className="spinner-border text-brown" role="status"></div>
        <div className="text-muted small mt-2">Loading transaction receipt...</div>
      </div>
    );
  }

  if (errorMsg || !entry) {
    return (
      <div className="alert alert-danger p-3 my-4 animate-scale-up">
        {errorMsg || 'Receipt details not found'}
        <div className="mt-3">
          <Link 
            to={user?.role === 'leader' ? `/leader/member/${entry?.user_id || ''}` : `/member/${entry?.user_id || ''}`} 
            className="btn btn-sm btn-outline-danger"
          >
            Back to Member Records
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0 animate-fade-in" style={{ maxWidth: '500px' }}>
      {/* Navigation Header */}
      <div className="mb-4 d-flex align-items-center gap-3 d-print-none">
        <button 
          onClick={() => navigate(-1)} 
          className="btn btn-outline-brown p-2 d-flex align-items-center justify-content-center border-2" 
          style={{ borderRadius: '10px', height: '40px', width: '40px' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="fw-extrabold text-brown m-0" style={{ fontFamily: "'Outfit', sans-serif" }}>Receipt Preview</h2>
          <p className="text-muted small m-0">View, print, or share transaction record receipt</p>
        </div>
      </div>

      {/* Printable Receipt Card */}
      <div className="card-glass p-4.5 border border-brown shadow-lg animate-scale-up" style={{ border: '2px solid var(--primary-brown) !important', borderRadius: '24px' }}>
        
        {/* Receipt Header */}
        <div className="text-center pb-3 border-bottom border-light mb-4">
          <h3 className="fw-extrabold text-brown mb-0.5" style={{ fontFamily: "'Outfit', sans-serif" }}>{t.appTitle}</h3>
          <span className="text-muted small italic fw-semibold">{t.tagline}</span>
          <div className="mt-3 text-brown fw-bold uppercase tracking-wider" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
            OFFICIAL DIGITAL TRANSACTION RECEIPT
          </div>
        </div>

        {/* Receipt Metadata */}
        <div className="d-flex flex-column gap-2.5 mb-4 text-start" style={{ fontSize: '13px' }}>
          <div className="d-flex justify-content-between align-items-center py-0.5">
            <span className="text-muted">Receipt Number:</span>
            <strong className="text-dark">SHG-TXN-{entry.id}</strong>
          </div>

          <div className="d-flex justify-content-between align-items-center py-0.5">
            <span className="text-muted">Transaction Date:</span>
            <span className="text-dark">
              {new Date(entry.transaction_date).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short'
              })}
            </span>
          </div>

          <div className="d-flex justify-content-between align-items-center py-0.5">
            <span className="text-muted">SHG Member Name:</span>
            <strong className="text-dark">{memberName}</strong>
          </div>

          <div className="d-flex justify-content-between align-items-center py-0.5">
            <span className="text-muted">Transaction Type:</span>
            <span>
              <span className={entry.transaction_type === 'deposit' ? 'badge-clear' : 'badge-due'} style={{ fontWeight: 'bold' }}>
                {entry.transaction_type === 'deposit' ? t.depositTitle : t.repayTitle}
              </span>
            </span>
          </div>

          <hr className="my-2 border-light" />

          {/* Money Breakdown details */}
          <div className="d-flex justify-content-between align-items-center py-1">
            <span className="text-muted">Asal Amount (Principal reduced):</span>
            <strong className="text-success">{formatCur(entry.asal_amount)}</strong>
          </div>

          <div className="d-flex justify-content-between align-items-center py-1">
            <span className="text-muted">Vatti Amount (Interest paid):</span>
            <strong className="text-danger">{formatCur(entry.vatti_amount)}</strong>
          </div>

          <div className="d-flex justify-content-between align-items-center py-2.5 border-bottom border-top border-light my-1">
            <strong className="text-brown fs-6" style={{ fontFamily: "'Outfit', sans-serif" }}>Total Payment Paid:</strong>
            <strong className="text-brown fs-5" style={{ fontFamily: "'Outfit', sans-serif" }}>{formatCur(entry.total_paid)}</strong>
          </div>

          <div className="d-flex justify-content-between align-items-center py-1">
            <span className="text-muted">Remaining Loan Balance:</span>
            <strong className="text-dark">{formatCur(entry.remaining_balance)}</strong>
          </div>
        </div>

        {/* Stamps / Signatures footer */}
        <div className="row mt-5 pt-3 border-top border-light justify-content-between align-items-center text-center" style={{ minHeight: '60px' }}>
          <div className="col-5 text-muted small" style={{ borderTop: '1px dashed var(--warm-border)', paddingTop: '6px', fontSize: '10px' }}>
            Member Signature
          </div>
          <div className="col-5 text-muted small" style={{ borderTop: '1px dashed var(--warm-border)', paddingTop: '6px', fontSize: '10px' }}>
            Thalaivi stamp
          </div>
        </div>

        {/* Verification Success badge */}
        <div className="text-center mt-4 text-success small fw-bold d-flex align-items-center justify-content-center gap-1.5" style={{ fontSize: '11px' }}>
          <ShieldCheck size={16} />
          <span>Digitally Signed &amp; Locked in SHEmpower Ledger</span>
        </div>
      </div>

      {/* Sharing & Printing Control Grid (Hidden on Print) */}
      <div className="row g-2.5 mt-4 d-print-none">
        <div className="col-6">
          <button 
            onClick={handlePrint}
            className="btn btn-brown touch-btn w-100 d-flex align-items-center justify-content-center gap-2"
          >
            <Printer size={18} />
            <span>Print Receipt</span>
          </button>
        </div>
        <div className="col-6">
          <button 
            onClick={handleWhatsAppShare}
            className="btn btn-outline-brown touch-btn bg-white w-100 d-flex align-items-center justify-content-center gap-2 border-2"
          >
            <Share2 size={18} style={{ color: 'var(--primary-brown)' }} />
            <span style={{ color: 'var(--primary-brown)' }}>Share WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
