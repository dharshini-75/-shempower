import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import { downloadPDFStatement } from '../utils/downloadHelper';
import { ArrowLeft, Share2, Clipboard, Printer, ShieldCheck } from 'lucide-react';

const Statement = () => {
  const { type, id } = useParams(); // type can be 'savings' or 'loans'
  const navigate = useNavigate();
  const { token, t, language } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchStatementDetails = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const res = await fetch(API_BASE_URL + `/api/loans/members/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const json = await res.json();
        if (json.success) {
          setData(json);
        } else {
          setErrorMsg(json.message || 'Failed to query statement records');
        }
      } catch (e) {
        setErrorMsg('Error connecting to the backend server');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchStatementDetails();
    }
  }, [id, token]);

  const formatCur = (num) => `₹${Math.round(Number(num || 0)).toLocaleString('en-IN')}`;

  // Process savings deposits
  const savingsData = useMemo(() => {
    if (!data) return [];
    const deposits = [...data.ledger_history]
      .filter(e => e.transaction_type === 'deposit')
      .sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));

    let runningSavings = 0;
    const processed = deposits.map(e => {
      runningSavings += Number(e.total_paid);
      return {
        ...e,
        runningSavings
      };
    });

    return processed.reverse(); // Newest first
  }, [data]);

  const repayments = useMemo(() => {
    if (!data) return [];
    return [...data.ledger_history]
      .filter(e => e.transaction_type === 'repayment')
      .sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));
  }, [data]);

  // Process loan requests
  const processedLoans = useMemo(() => {
    if (!data) return [];
    const sortedLoans = [...data.loan_history].sort((a, b) => new Date(a.requested_date || a.created_at) - new Date(b.requested_date || b.created_at));
    const sortedRepayments = [...repayments].sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));

    const mapped = sortedLoans.map((loan) => {
      if (loan.status !== 'approved') {
        return {
          ...loan,
          interestPaid: 0,
          asalPaid: 0,
          totalPaid: 0,
          remainingBalance: loan.status === 'rejected' ? 0 : loan.amount_requested,
          derivedStatus: loan.status === 'rejected' ? 'Rejected' : 'Pending'
        };
      }

      const loanDate = new Date(loan.requested_date || loan.created_at);
      const nextLoan = sortedLoans
        .filter(l => l.status === 'approved')
        .find(l => new Date(l.requested_date || l.created_at) > loanDate);
      const nextLoanDate = nextLoan ? new Date(nextLoan.requested_date || nextLoan.created_at) : null;

      const loanRepayments = sortedRepayments.filter(r => {
        const rDate = new Date(r.transaction_date);
        if (rDate < loanDate) return false;
        if (nextLoanDate && rDate >= nextLoanDate) return false;
        return true;
      });

      const totalPaid = loanRepayments.reduce((sum, r) => sum + Number(r.total_paid), 0);
      const asalPaid = loanRepayments.reduce((sum, r) => sum + Number(r.asal_amount), 0);
      const interestPaid = loanRepayments.reduce((sum, r) => sum + Number(r.vatti_amount), 0);

      const latestRepayment = loanRepayments[loanRepayments.length - 1];
      const remainingBalance = latestRepayment ? latestRepayment.remaining_balance : loan.amount_requested;

      let derivedStatus = 'Active';
      if (Number(remainingBalance) <= 0.05) {
        derivedStatus = 'Paid';
      }

      return {
        ...loan,
        interestPaid,
        asalPaid,
        totalPaid,
        remainingBalance,
        derivedStatus
      };
    });

    return mapped.reverse();
  }, [data, repayments]);

  const totalOutstanding = useMemo(() => {
    return processedLoans
      .filter(l => l.status === 'approved' && l.derivedStatus === 'Active')
      .reduce((sum, l) => sum + Number(l.remainingBalance), 0);
  }, [processedLoans]);

  // Formats text version for clipboard and sharing sheets
  const shareTextContent = useMemo(() => {
    if (!data) return '';
    const { member } = data;
    const dateStr = new Date().toLocaleDateString('en-IN');

    if (type === 'savings') {
      let text = `*SHEmpower Savings Statement*\n`;
      text += `---------------------------------------\n`;
      text += `*Member:* ${member.full_name}\n`;
      text += `*Mobile:* ${member.mobile_number}\n`;
      text += `*Role:* ${member.role === 'leader' ? 'Leader' : 'Member'}\n`;
      text += `*Date:* ${dateStr}\n`;
      text += `---------------------------------------\n\n`;
      text += `*SAVINGS PASSBOOK LOGS*\n`;
      text += `Date | Deposit | Balance\n`;
      text += `---------------------------------------\n`;
      savingsData.forEach(e => {
        const dStr = new Date(e.transaction_date).toLocaleDateString('en-IN', { dateStyle: 'short' });
        text += `${dStr} | Rs ${Number(e.total_paid).toFixed(2)} | Rs ${Number(e.runningSavings).toFixed(2)}\n`;
      });
      text += `---------------------------------------\n`;
      const totalSavings = savingsData.length > 0 ? savingsData[0].runningSavings : 0;
      text += `*Total Savings:* Rs ${Number(totalSavings).toFixed(2)}\n`;
      text += `\n*SHEmpower Verified*`;
      return text;
    } else {
      let text = `*SHEmpower Loan Statement*\n`;
      text += `---------------------------------------\n`;
      text += `*Member:* ${member.full_name}\n`;
      text += `*Mobile:* ${member.mobile_number}\n`;
      text += `*Role:* ${member.role === 'leader' ? 'Leader' : 'Member'}\n`;
      text += `*Date:* ${dateStr}\n`;
      text += `---------------------------------------\n\n`;
      text += `*LOAN RECORDS LOGS*\n`;
      text += `Date | Loan Amt | Paid | Interest | Bal | Status\n`;
      text += `---------------------------------------\n`;
      processedLoans.forEach(loan => {
        const dStr = new Date(loan.requested_date || loan.created_at).toLocaleDateString('en-IN', { dateStyle: 'short' });
        const statusText = loan.status === 'approved' ? loan.derivedStatus : loan.status;
        text += `${dStr} | Rs ${Number(loan.amount_requested).toFixed(2)} | Rs ${Number(loan.asalPaid).toFixed(2)} | Rs ${Number(loan.interestPaid).toFixed(2)} | Rs ${Number(loan.remainingBalance).toFixed(2)} | ${statusText.toUpperCase()}\n`;
      });
      text += `---------------------------------------\n`;
      text += `*Total Outstanding:* Rs ${Number(totalOutstanding).toFixed(2)}\n`;
      text += `\n*SHEmpower Verified*`;
      return text;
    }
  }, [data, type, savingsData, processedLoans, totalOutstanding]);

  const [downloadAlertMsg, setDownloadAlertMsg] = useState('');

  // Direct PDF generation and download trigger
  const handleDownloadPDF = async () => {
    if (!data || !data.member) return;
    const { member } = data;
    setDownloadAlertMsg('');

    try {
      const memberName = member.full_name;
      const memberId = member.id;
      const safeName = memberName.trim().replace(/[^a-zA-Z0-9]/g, '_');
      const filename = type === 'savings'
        ? `SHEmpower_Savings_Passbook_${safeName}.pdf`
        : `SHEmpower_Loan_Records_${safeName}.pdf`;

      const rows = type === 'savings'
        ? savingsData.map(e => [
            formatDate(e.transaction_date),
            Math.round(Number(e.total_paid || 0)),
            Math.round(Number(e.runningSavings || 0))
          ])
        : processedLoans.map(loan => [
            formatDate(loan.requested_date || loan.created_at),
            Math.round(Number(loan.amount_requested || 0)),
            Math.round(Number(loan.asalPaid || 0)),
            Math.round(Number(loan.interestPaid || 0)),
            Math.round(Number(loan.remainingBalance || 0))
          ]);

      const result = await downloadPDFStatement({
        filename,
        title: type === 'savings' ? (t.savingsPassbook || 'SAVINGS STATEMENT') : (t.loanRecords || 'LOAN STATEMENT'),
        type,
        rows,
        memberName,
        memberId
      });
      if (result && result.success) {
        setDownloadAlertMsg('PDF downloaded successfully.');
        setTimeout(() => setDownloadAlertMsg(''), 4000);
      }
    } catch (e) {
      console.error("PDF download failure:", e);
      setDownloadAlertMsg('Unable to download PDF.');
      setTimeout(() => setDownloadAlertMsg(''), 4000);
    }
  };

  // Triggers native sharing popup
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${type === 'savings' ? 'Savings' : 'Loans'} Statement`,
          text: shareTextContent
        });
      } catch (e) {
        console.warn("Share sheet closed/dismissed");
      }
    } else {
      handleCopyToClipboard();
    }
  };

  // WhatsApp share link trigger
  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(shareTextContent);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // Copies the formatting logs string to device clipboard
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(shareTextContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="text-center py-5 safe-wrapper animate-fade-in">
        <div className="spinner-border text-brown" role="status"></div>
        <div className="text-muted small mt-2">Generating statement view...</div>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="container py-5 text-center safe-wrapper">
        <div className="alert alert-danger p-3 my-4 animate-scale-up">
          {errorMsg || 'Statement records not found'}
        </div>
        <button onClick={() => navigate(-1)} className="btn btn-brown">
          Go Back
        </button>
      </div>
    );
  }

  const { member } = data;

  return (
    <div className="container-fluid p-0 animate-fade-in" style={{ maxWidth: '800px', paddingBottom: '80px' }}>
      
      {downloadAlertMsg && (
        <div className={`alert ${downloadAlertMsg.includes('Unable') ? 'alert-danger' : 'alert-success'} py-2.5 px-4 rounded-3 mb-3 border-0 d-flex align-items-center justify-content-between gap-2 shadow-sm`} style={{ backgroundColor: downloadAlertMsg.includes('Unable') ? 'var(--terracotta-danger-light)' : 'var(--success-olive-light)', color: downloadAlertMsg.includes('Unable') ? 'var(--terracotta-danger)' : '#2E7D32' }}>
          <span className="fw-bold small">{downloadAlertMsg}</span>
          <button type="button" className="btn-close shadow-none" onClick={() => setDownloadAlertMsg('')} />
        </div>
      )}

      {/* Document Header Controls (Hidden on Print) */}
      <div className="d-print-none mb-4 d-flex flex-column gap-3 border-bottom border-light pb-3">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="btn btn-outline-brown p-2 d-flex align-items-center justify-content-center border-2" 
              style={{ borderRadius: '10px', height: '40px', width: '40px' }}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h3 className="fw-extrabold text-brown m-0" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px' }}>Statement Preview</h3>
              <p className="text-muted small m-0">View, share, or download statement details</p>
            </div>
          </div>

          <button 
            onClick={handleDownloadPDF}
            className="btn btn-brown d-flex align-items-center gap-1.5 px-3.5 py-2 shadow-sm"
            style={{ borderRadius: '8px', fontSize: '13px' }}
          >
            <Printer size={15} />
            <span>Download PDF</span>
          </button>
        </div>

        {/* Mobile Sharing Buttons */}
        <div className="d-flex gap-2 w-100 flex-wrap">
          <button 
            onClick={handleWhatsAppShare}
            className="btn btn-success flex-grow-1 d-flex align-items-center justify-content-center gap-1.5 py-2 px-3 text-white"
            style={{ borderRadius: '8px', fontSize: '12px', background: '#25D366', border: 'none' }}
          >
            <span>Share to WhatsApp</span>
          </button>
          
          <button 
            onClick={handleNativeShare}
            className="btn btn-info flex-grow-1 d-flex align-items-center justify-content-center gap-1.5 py-2 px-3 text-white"
            style={{ borderRadius: '8px', fontSize: '12px', background: '#0088cc', border: 'none' }}
          >
            <Share2 size={13} />
            <span>Share Statement</span>
          </button>

          <button 
            onClick={handleCopyToClipboard}
            className="btn btn-outline-brown flex-grow-1 d-flex align-items-center justify-content-center gap-1.5 py-2 px-3"
            style={{ borderRadius: '8px', fontSize: '12px', border: '1px solid var(--primary-brown)' }}
          >
            <Clipboard size={13} />
            <span>{copied ? 'Copied!' : 'Copy Text'}</span>
          </button>
        </div>
      </div>

      {/* Formal Printable Statement Container */}
      <div className="bg-white p-4.5 p-md-5 border rounded-4 shadow-sm" style={{ minHeight: '297mm', color: '#2d3748' }}>
        
        {/* Branding Title */}
        <div className="text-center pb-3 border-bottom border-light mb-4">
          <h2 className="fw-extrabold text-brown mb-0.5" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '26px', letterSpacing: '1px' }}>
            SHE EMPOWER
          </h2>
          <span className="text-muted small italic fw-semibold">Empowering Women through Financial Inclusion</span>
        </div>

        {/* Profile Metadata Grid */}
        <div className="p-3.5 rounded-3 mb-4 d-flex justify-content-between align-items-start" style={{ background: '#FAF7F2', border: '1px solid #E7E2D9', fontSize: '13px' }}>
          <div className="d-flex flex-column gap-1">
            <div><span className="text-muted fw-bold">Member Name:</span> <strong className="text-dark">{member.full_name}</strong></div>
            <div><span className="text-muted fw-bold">Mobile Number:</span> <span className="text-dark">{member.mobile_number}</span></div>
            <div><span className="text-muted fw-bold">Group Role:</span> <span className="text-dark" style={{ textTransform: 'capitalize' }}>{member.role}</span></div>
          </div>
          <div className="d-flex flex-column gap-1 text-end">
            {type === 'savings' ? (
              <div><span className="text-muted fw-bold">Total Savings:</span> <strong className="text-success">{formatCur(savingsData.length > 0 ? savingsData[0].runningSavings : 0)}</strong></div>
            ) : (
              <div><span className="text-muted fw-bold">Total Outstanding:</span> <strong className="text-danger">{formatCur(totalOutstanding)}</strong></div>
            )}
            <div><span className="text-muted fw-bold">Statement Date:</span> <span className="text-dark">{new Date().toLocaleDateString('en-IN')}</span></div>
          </div>
        </div>

        {/* Statement Table Section */}
        {type === 'savings' ? (
          <div>
            <h4 className="fw-bold mb-2.5 text-brown border-bottom pb-1.5" style={{ fontSize: '14px', letterSpacing: '0.5px' }}>
              SAVINGS STATEMENT
            </h4>
            <div className="table-responsive">
              <table className="table table-bordered text-start m-0" style={{ fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#FAF7F2' }}>
                    <th style={{ color: '#8B5E3C' }}>Date</th>
                    <th style={{ color: '#8B5E3C' }}>Description</th>
                    <th style={{ color: '#8B5E3C', textAlign: 'right' }}>Deposit</th>
                    <th style={{ color: '#8B5E3C', textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {savingsData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-3">No deposit records found.</td>
                    </tr>
                  ) : (
                    savingsData.map((e) => (
                      <tr key={e.id}>
                        <td>{new Date(e.transaction_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                        <td>Monthly Savings</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#385723' }}>+{formatCur(e.total_paid)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#8B5E3C' }}>{formatCur(e.runningSavings)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <h4 className="fw-bold mb-2.5 text-brown border-bottom pb-1.5" style={{ fontSize: '14px', letterSpacing: '0.5px' }}>
              LOAN RECORDS STATEMENT
            </h4>
            <div className="table-responsive">
              <table className="table table-bordered text-start m-0" style={{ fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#FAF7F2' }}>
                    <th style={{ color: '#8B5E3C' }}>Date</th>
                    <th style={{ color: '#8B5E3C', textAlign: 'right' }}>Loan Amount</th>
                    <th style={{ color: '#8B5E3C', textAlign: 'right' }}>Paid Amount</th>
                    <th style={{ color: '#8B5E3C', textAlign: 'right' }}>Interest</th>
                    <th style={{ color: '#8B5E3C', textAlign: 'right' }}>Remaining Balance</th>
                    <th style={{ color: '#8B5E3C', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {processedLoans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-3">No loan records found.</td>
                    </tr>
                  ) : (
                    processedLoans.map((loan) => (
                      <tr key={loan.id}>
                        <td>{new Date(loan.requested_date || loan.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCur(loan.amount_requested)}</td>
                        <td style={{ textAlign: 'right', color: '#385723', fontWeight: 'bold' }}>{formatCur(loan.asalPaid)}</td>
                        <td style={{ textAlign: 'right', color: '#7f6000' }}>{formatCur(loan.interestPaid)}</td>
                        <td style={{ textAlign: 'right', color: '#c65911', fontWeight: 'bold' }}>{formatCur(loan.remainingBalance)}</td>
                        <td style={{ textAlign: 'center', textTransform: 'uppercase', fontSize: '10.5px', fontWeight: 'bold' }}>
                          {loan.status === 'approved' ? loan.derivedStatus : loan.status}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Signature Boxes */}
        <div className="mt-5 pt-4 d-flex justify-content-between align-items-center" style={{ fontSize: '12px' }}>
          <div className="text-center" style={{ width: '200px', borderTop: '1px dashed #718096', paddingTop: '6px', marginTop: '30px' }}>
            Member Signature
          </div>
          
          <div className="d-flex align-items-center gap-1.5 text-success fw-bold" style={{ fontSize: '11px' }}>
            <ShieldCheck size={16} />
            <span>SHEmpower Verified</span>
          </div>

          <div className="text-center" style={{ width: '200px', borderTop: '1px dashed #718096', paddingTop: '6px', marginTop: '30px' }}>
            Thalaivi Stamp & Signature
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statement;
