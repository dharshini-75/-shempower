import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import { Phone, ArrowLeft, PiggyBank, HandCoins, HelpCircle, Calendar, FileText, Printer, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { downloadStatement, downloadPDFStatement } from '../utils/downloadHelper';

const formatDate = (dateString) => {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const MemberDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, t } = useAuth();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Tab state for member details
  const [activeTab, setActiveTab] = useState('savings'); // savings, loans
  
  // Collapsible repayments state
  const [expandedLoanId, setExpandedLoanId] = useState(null);

  // Financial records show/hide state
  const [showRecords, setShowRecords] = useState(false);

  // Download status states
  const [savingsDownloading, setSavingsDownloading] = useState(false);
  const [savingsPdfDownloading, setSavingsPdfDownloading] = useState(false);
  const [loanDownloading, setLoanDownloading] = useState(false);
  const [loanPdfDownloading, setLoanPdfDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  // Security check: Group member can only view their own profile. Group leader can view any profile.
  const isAuthorized = useMemo(() => {
    if (!user) return false;
    if (user.role === 'leader') return true;
    return Number(user.id) === Number(id);
  }, [user, id]);

  useEffect(() => {
    if (!isAuthorized) {
      setLoading(false);
      setErrorMsg('Unauthorized access. You can only view your own financial records.');
      return;
    }

    const loadDetails = async () => {
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
          setErrorMsg(json.message || 'Failed to load member profile details');
        }
      } catch (e) {
        setErrorMsg('Error connecting to the backend server');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadDetails();
    }
  }, [id, token, isAuthorized]);

  const formatCur = (num) => `₹${Math.round(Number(num || 0)).toLocaleString('en-IN')}`;

  // Compute Savings and Loans lists from fetched records
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

  const loanRepayments = useMemo(() => {
    if (!data) return [];
    return [...data.ledger_history]
      .filter(e => e.transaction_type === 'repayment')
      .sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));
  }, [data]);

  // Group repayments by loan requests chronologically
  const processedLoans = useMemo(() => {
    if (!data) return [];
    
    // Sort ascending to trace repayments timeline
    const sortedLoans = [...data.loan_history].sort((a, b) => new Date(a.requested_date || a.created_at) - new Date(b.requested_date || b.created_at));
    const sortedRepayments = [...loanRepayments].sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));

    const mapped = sortedLoans.map((loan, index) => {
      if (loan.status !== 'approved') {
        return {
          ...loan,
          interestPaid: 0,
          asalPaid: 0,
          totalPaid: 0,
          remainingBalance: loan.status === 'rejected' ? 0 : loan.amount_requested,
          derivedStatus: loan.status === 'rejected' ? 'Rejected' : 'Pending',
          paymentHistory: []
        };
      }

      const loanDate = new Date(loan.requested_date || loan.created_at);
      const nextLoan = sortedLoans
        .filter(l => l.status === 'approved')
        .find(l => new Date(l.requested_date || l.created_at) > loanDate);
      const nextLoanDate = nextLoan ? new Date(nextLoan.requested_date || nextLoan.created_at) : null;

      const matchedRepayments = sortedRepayments.filter(r => {
        const rDate = new Date(r.transaction_date);
        if (rDate < loanDate) return false;
        if (nextLoanDate && rDate >= nextLoanDate) return false;
        return true;
      });

      const totalPaid = matchedRepayments.reduce((sum, r) => sum + Number(r.total_paid), 0);
      const asalPaid = matchedRepayments.reduce((sum, r) => sum + Number(r.asal_amount), 0);
      const interestPaid = matchedRepayments.reduce((sum, r) => sum + Number(r.vatti_amount), 0);

      const latestRepayment = matchedRepayments[matchedRepayments.length - 1];
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
        derivedStatus,
        paymentHistory: matchedRepayments.reverse() // Newest repayments first in subtable
      };
    });

    return mapped.reverse(); // Newest loans first for UI listing
  }, [data, loanRepayments]);

  const loanMetrics = useMemo(() => {
    if (!data) return { hasLoan: false, totalLoanTaken: 0, principalPaid: 0, interestPaid: 0, remainingLoanDue: 0 };
    
    const approvedLoans = data.loan_history.filter(l => l.status === 'approved');
    const totalLoanTaken = approvedLoans.reduce((sum, l) => sum + Number(l.amount_requested), 0);
    const repayments = data.ledger_history.filter(e => e.transaction_type === 'repayment');
    
    const principalPaid = repayments.reduce((sum, e) => sum + Number(e.asal_amount), 0);
    const interestPaid = repayments.reduce((sum, e) => sum + Number(e.vatti_amount), 0);
    
    const hasLoan = approvedLoans.length > 0 || repayments.length > 0;
    const remainingLoanDue = Math.max(0, totalLoanTaken - principalPaid);

    return {
      hasLoan,
      totalLoanTaken,
      principalPaid,
      interestPaid,
      remainingLoanDue
    };
  }, [data]);

  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState('');
  const isLeader = useMemo(() => user?.role?.toLowerCase() === 'leader', [user]);

  const handleDownloadSavingsStatement = async () => {
    if (!data || !data.member) return;
    setSavingsDownloading(true);
    setDownloadError('');
    setDownloadSuccessMsg('');
    const memberName = data.member.full_name;
    const memberId = data.member.id;
    const safeName = memberName.trim().replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `SHEmpower_Savings_Report_${safeName}.csv`;

    const headers = ['Member Name', 'Member ID', 'Date', 'Deposit', 'Balance'];
    const rows = savingsData.map(e => [
      memberName,
      memberId,
      formatDate(e.transaction_date),
      Math.round(Number(e.total_paid || 0)),
      Math.round(Number(e.runningSavings || 0))
    ]);

    try {
      const res = await downloadStatement({ filename, headers, rows, memberName });
      if (res && res.success) {
        setDownloadSuccessMsg('CSV downloaded successfully.');
        setTimeout(() => setDownloadSuccessMsg(''), 4000);
      }
    } catch (error) {
      setDownloadError('Unable to download CSV.');
    } finally {
      setSavingsDownloading(false);
    }
  };

  const handleDownloadSavingsPDF = async () => {
    if (!data || !data.member) return;
    setSavingsPdfDownloading(true);
    setDownloadError('');
    setDownloadSuccessMsg('');
    const memberName = data.member.full_name;
    const memberId = data.member.id;
    const safeName = memberName.trim().replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `SHEmpower_Savings_Passbook_${safeName}.pdf`;

    const rows = savingsData.map(e => [
      formatDate(e.transaction_date),
      Math.round(Number(e.total_paid || 0)),
      Math.round(Number(e.runningSavings || 0))
    ]);

    try {
      const res = await downloadPDFStatement({ 
        filename, 
        title: t.savingsPassbook || 'SAVINGS STATEMENT', 
        type: 'savings',
        rows, 
        memberName, 
        memberId
      });
      if (res && res.success) {
        setDownloadSuccessMsg('PDF downloaded successfully.');
        setTimeout(() => setDownloadSuccessMsg(''), 4000);
      }
    } catch (error) {
      setDownloadError('Unable to download PDF.');
    } finally {
      setSavingsPdfDownloading(false);
    }
  };

  const handleDownloadLoanStatement = async () => {
    if (!data || !data.member) return;
    setLoanDownloading(true);
    setDownloadError('');
    setDownloadSuccessMsg('');
    const memberName = data.member.full_name;
    const memberId = data.member.id;
    const safeName = memberName.trim().replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `SHEmpower_Loan_Report_${safeName}.csv`;

    const headers = ['Member Name', 'Member ID', 'Date', 'Loan Amount', 'Paid Amount', 'Interest', 'Remaining Balance'];
    const rows = processedLoans.map(loan => [
      memberName,
      memberId,
      formatDate(loan.requested_date || loan.created_at),
      Math.round(Number(loan.amount_requested || 0)),
      Math.round(Number(loan.asalPaid || 0)),
      Math.round(Number(loan.interestPaid || 0)),
      Math.round(Number(loan.remainingBalance || 0))
    ]);

    try {
      const res = await downloadStatement({ filename, headers, rows, memberName });
      if (res && res.success) {
        setDownloadSuccessMsg('CSV downloaded successfully.');
        setTimeout(() => setDownloadSuccessMsg(''), 4000);
      }
    } catch (error) {
      setDownloadError('Unable to download CSV.');
    } finally {
      setLoanDownloading(false);
    }
  };

  const handleDownloadLoanPDF = async () => {
    if (!data || !data.member) return;
    setLoanPdfDownloading(true);
    setDownloadError('');
    setDownloadSuccessMsg('');
    const memberName = data.member.full_name;
    const memberId = data.member.id;
    const safeName = memberName.trim().replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `SHEmpower_Loan_Records_${safeName}.pdf`;

    const rows = processedLoans.map(loan => [
      formatDate(loan.requested_date || loan.created_at),
      Math.round(Number(loan.amount_requested || 0)),
      Math.round(Number(loan.asalPaid || 0)),
      Math.round(Number(loan.interestPaid || 0)),
      Math.round(Number(loan.remainingBalance || 0))
    ]);

    try {
      const res = await downloadPDFStatement({ 
        filename, 
        title: t.loanRecords || 'LOAN STATEMENT', 
        type: 'loans',
        rows, 
        memberName, 
        memberId
      });
      if (res && res.success) {
        setDownloadSuccessMsg('PDF downloaded successfully.');
        setTimeout(() => setDownloadSuccessMsg(''), 4000);
      }
    } catch (error) {
      setDownloadError('Unable to download PDF.');
    } finally {
      setLoanPdfDownloading(false);
    }
  };

  const toggleExpandLoan = (loanId) => {
    setExpandedLoanId(prev => prev === loanId ? null : loanId);
  };

  if (loading) {
    return (
      <div className="text-center py-5 safe-wrapper animate-fade-in">
        <div className="spinner-border text-brown" role="status"></div>
        <div className="text-muted small mt-2">Loading member record...</div>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="container py-5 text-center safe-wrapper">
        <div className="alert alert-danger p-3 my-4 animate-scale-up">
          {errorMsg || 'Member details not found'}
        </div>
        <div className="mt-3">
          <Link to={user?.role === 'leader' ? '/members' : '/member-dashboard'} className="btn btn-brown px-4 py-2" style={{ borderRadius: '8px' }}>
            {user?.role === 'leader' ? 'Back to Roster' : 'Back to Dashboard'}
          </Link>
        </div>
      </div>
    );
  }

  const { member } = data;

  return (
    <div className="container-fluid p-0 safe-wrapper animate-fade-in" style={{ paddingBottom: '100px' }}>
      {/* Navigation Header */}
      <div className="mb-4 d-flex align-items-center gap-3">
        <button 
          onClick={() => navigate(-1)} 
          className="btn btn-outline-brown p-2 d-flex align-items-center justify-content-center border-2" 
          style={{ borderRadius: '10px', height: '40px', width: '40px' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="fw-extrabold text-brown m-0" style={{ fontFamily: "'Outfit', sans-serif" }}>{member.full_name}</h2>
          <p className="text-muted small m-0">{t.memberProfileSub || 'Member Profile Details & Ledger Statements'}</p>
        </div>
      </div>

      <div className="row g-4">
        {/* Core Member Profile Metadata */}
        <div className="col-12 col-lg-4">
          <div className="card-glass p-4 shadow-sm border border-light">
            <h5 className="fw-bold mb-3 border-bottom border-light pb-2 text-brown" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '15px' }}>
              {t.profileInfo || 'Profile Info'}
            </h5>
            
            <div className="d-flex flex-column gap-3 small">
              <div>
                <span className="text-muted text-uppercase fw-bold d-block" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>{t.fullName || 'Full Name'}</span>
                <strong className="text-dark d-block fs-6">{member.full_name}</strong>
              </div>

              <div>
                <span className="text-muted text-uppercase fw-bold d-block" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>{t.mobileNumber || '10-Digit Mobile Number'}</span>
                <strong className="text-dark d-block">{member.mobile_number}</strong>
              </div>

              <div>
                <span className="text-muted text-uppercase fw-bold d-block" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>{t.savings || 'Total Savings'}</span>
                <strong className="text-success d-block fs-6">{formatCur(savingsData.length > 0 ? savingsData[0].runningSavings : member.lifetime_savings)}</strong>
              </div>

              <div>
                <span className="text-muted text-uppercase fw-bold d-block" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>{t.totalLoanAmount || 'Total Loan Amount'}</span>
                <strong className="text-brown d-block fs-6">{formatCur(member.total_loan_amount || loanMetrics.totalLoanTaken)}</strong>
              </div>

              <div>
                <span className="text-muted text-uppercase fw-bold d-block" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>{t.amountPaid || 'Amount Paid'}</span>
                <strong className="text-info d-block fs-6">{formatCur(member.amount_paid || loanMetrics.principalPaid)}</strong>
              </div>

              <div>
                <span className="text-muted text-uppercase fw-bold d-block" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>{t.interestPaid || 'Interest Paid'}</span>
                <strong className="text-primary d-block fs-6">{formatCur(member.interest_paid || loanMetrics.interestPaid)}</strong>
              </div>

              <div>
                <span className="text-muted text-uppercase fw-bold d-block" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>{t.remainingLoan || 'Remaining Loan'}</span>
                <strong className="text-danger d-block fs-6">{formatCur(member.outstanding_loan || loanMetrics.remainingLoanDue)}</strong>
              </div>

              <div>
                <span className="text-muted text-uppercase fw-bold d-block" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>{t.accountStatus || 'Account Status'}</span>
                <div className="mt-1">
                  <span className={(member.outstanding_loan || loanMetrics.remainingLoanDue) === 0 ? 'badge-clear' : 'badge-due'} style={{ fontWeight: 'bold' }}>
                    {(member.outstanding_loan || loanMetrics.remainingLoanDue) === 0 ? t.clearStatus : t.dueStatus}
                  </span>
                </div>
              </div>

              {/* Direct call button */}
              {user?.role === 'leader' && (
                <a 
                  href={`tel:${member.mobile_number}`}
                  className="btn btn-brown touch-btn shadow w-100 mt-2 d-flex align-items-center justify-content-center gap-2"
                  style={{ textDecoration: 'none' }}
                >
                  <Phone size={16} />
                  <span>{t.directCall}</span>
                </a>
              )}

              {/* Financial Records Access Button */}
              <button 
                onClick={() => setShowRecords(!showRecords)}
                className="btn btn-outline-brown w-100 mt-2 d-flex align-items-center justify-content-center gap-2 border-2"
                style={{ borderRadius: '12px', fontWeight: 'bold', borderColor: 'var(--primary-brown)' }}
              >
                <BookOpen size={16} />
                <span>{showRecords ? (t.hideFinancialRecords || 'Hide Financial Records') : (t.viewFinancialRecords || 'View Financial Records')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabbed Passbooks & Requests Panels */}
        <div className="col-12 col-lg-8">
          {downloadSuccessMsg && (
            <div className="alert alert-success p-3 mb-3 small fw-bold text-success border-0 shadow-sm" style={{ backgroundColor: 'var(--success-olive-light)', borderRadius: '10px' }}>
              🎉 {downloadSuccessMsg}
            </div>
          )}

          {downloadError && (
            <div className="alert alert-danger p-3 mb-3 small border-0 shadow-sm" style={{ borderRadius: '10px' }}>
              ⚠️ {downloadError}
            </div>
          )}

          {!showRecords ? (
            <div className="card-glass p-5 text-center shadow-sm border border-light d-flex flex-column align-items-center justify-content-center gap-3" style={{ minHeight: '300px' }}>
              <BookOpen size={48} className="text-brown opacity-75" />
              <div>
                <h5 className="fw-bold text-brown" style={{ fontFamily: "'Outfit', sans-serif" }}>Financial Records</h5>
                <p className="text-muted small mx-auto m-0" style={{ maxWidth: '340px' }}>
                  Access this member's secure savings passbook ledger logs and micro-loan outstanding history tables.
                </p>
              </div>
              <button 
                onClick={() => setShowRecords(true)}
                className="btn btn-brown px-4 py-2 shadow-sm"
                style={{ borderRadius: '8px', fontSize: '13px' }}
              >
                View Records
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Tab Control Buttons */}
              <div className="d-flex gap-2 mb-3 border-bottom border-light pb-2">
                <button 
                  onClick={() => setActiveTab('savings')} 
                  className={`btn btn-sm py-2 px-3 border-0 rounded-pill ${activeTab === 'savings' ? 'btn-brown shadow-sm' : 'btn-outline-brown bg-white'}`}
                  style={{ fontSize: '12.5px', fontWeight: 'bold' }}
                >
                  Savings Passbook
                </button>
                <button 
                  onClick={() => setActiveTab('loans')} 
                  className={`btn btn-sm py-2 px-3 border-0 rounded-pill ${activeTab === 'loans' ? 'btn-brown shadow-sm' : 'btn-outline-brown bg-white'}`}
                  style={{ fontSize: '12.5px', fontWeight: 'bold' }}
                >
                  Loan Records
                </button>
              </div>

              <div className="d-flex flex-column gap-4">
                
                {/* TAB A: Savings Passbook */}
                {activeTab === 'savings' && (
                  <div className="p-4 bg-white border border-light rounded-4 shadow-sm animate-scale-up">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2.5 mb-3">
                      <div>
                        <h5 className="fw-bold mb-1 text-brown" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '15px' }}>
                          Semippu Passbook (Savings Ledger)
                        </h5>
                      </div>
                      <div className="d-flex flex-column gap-2" style={{ minWidth: '160px' }}>
                        {savingsData.length > 0 && (
                          <>
                            <button 
                              onClick={handleDownloadSavingsPDF}
                              disabled={savingsPdfDownloading}
                              className="btn btn-sm btn-brown d-flex align-items-center justify-content-center gap-2 touch-btn"
                              style={{ borderRadius: '20px', fontSize: '12px', fontWeight: '600', width: '100%', padding: '8px 0', pointerEvents: 'auto' }}
                            >
                              <FileText size={13} />
                              <span>{savingsPdfDownloading ? 'Saving…' : 'Download PDF'}</span>
                            </button>
                            {isLeader && (
                              <button 
                                onClick={handleDownloadSavingsStatement}
                                disabled={savingsDownloading}
                                className="btn btn-sm btn-outline-brown d-flex align-items-center justify-content-center gap-2 touch-btn"
                                style={{ borderRadius: '20px', fontSize: '12px', fontWeight: '600', width: '100%', padding: '8px 0', pointerEvents: 'auto' }}
                              >
                                <FileText size={13} />
                                <span>{savingsDownloading ? 'Saving…' : 'Download CSV'}</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Standard Scrollable Table */}
                    <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
                      {savingsData.length === 0 ? (
                        <div className="text-center py-5 border border-dashed rounded-3 mt-2">
                          <BookOpen size={36} className="mb-2 opacity-50 text-brown" />
                          <div className="fw-semibold text-muted">{t.noSavingsFound || 'No savings records found.'}</div>
                        </div>
                      ) : (
                        <table className="table table-bordered table-warm text-start m-0" style={{ minWidth: '500px', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ background: '#FAF7F2' }}>
                              <th style={{ textAlign: 'left', fontWeight: 'bold', color: '#8B5E3C' }}>{t.date || 'Date'}</th>
                              <th style={{ textAlign: 'right', fontWeight: 'bold', color: '#8B5E3C' }}>{t.deposit || 'Deposit'}</th>
                              <th style={{ textAlign: 'right', fontWeight: 'bold', color: '#8B5E3C' }}>{t.balance || 'Balance'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {savingsData.map(e => (
                              <tr key={e.id}>
                                <td style={{ textAlign: 'left' }}>
                                  {formatDate(e.transaction_date)}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#385723' }}>+{formatCur(e.total_paid)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#8B5E3C' }}>{formatCur(e.runningSavings)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB B: Loan Records */}
                {activeTab === 'loans' && (
                  <div className="p-4 bg-white border border-light rounded-4 shadow-sm animate-scale-up">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2.5 mb-3">
                      <div>
                        <h5 className="fw-bold mb-1 text-brown" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '15px' }}>
                          {t.loanRecords || 'Loan Records'}
                        </h5>
                        <p className="text-muted small m-0">Timeline of approved loan disbursements and statuses</p>
                      </div>
                      <div className="d-flex flex-column gap-2" style={{ minWidth: '160px' }}>
                        {processedLoans.length > 0 && (
                          <>
                            <button 
                              onClick={handleDownloadLoanPDF}
                              disabled={loanPdfDownloading}
                              className="btn btn-sm btn-brown d-flex align-items-center justify-content-center gap-2 touch-btn"
                              style={{ borderRadius: '20px', fontSize: '12px', fontWeight: '600', width: '100%', padding: '8px 0', pointerEvents: 'auto' }}
                            >
                              <FileText size={13} />
                              <span>{loanPdfDownloading ? 'Saving…' : 'Download PDF'}</span>
                            </button>
                            {isLeader && (
                              <button 
                                onClick={handleDownloadLoanStatement}
                                disabled={loanDownloading}
                                className="btn btn-sm btn-outline-brown d-flex align-items-center justify-content-center gap-2 touch-btn"
                                style={{ borderRadius: '20px', fontSize: '12px', fontWeight: '600', width: '100%', padding: '8px 0', pointerEvents: 'auto' }}
                              >
                                <FileText size={13} />
                                <span>{loanDownloading ? 'Saving…' : 'Download CSV'}</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Standard Scrollable Table */}
                    <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
                      {processedLoans.length === 0 ? (
                        <div className="text-center py-5 border border-dashed rounded-3 mt-2">
                          <HandCoins size={36} className="mb-2 opacity-50 text-brown" />
                          <div className="fw-semibold text-muted">No loan records found.</div>
                        </div>
                      ) : (
                        <table className="table table-bordered table-warm text-start m-0" style={{ minWidth: '600px', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ background: '#FAF7F2' }}>
                              <th style={{ textAlign: 'left', fontWeight: 'bold', color: '#8B5E3C' }}>Date</th>
                              <th style={{ textAlign: 'right', fontWeight: 'bold', color: '#8B5E3C' }}>Loan Amount</th>
                              <th style={{ textAlign: 'right', fontWeight: 'bold', color: '#8B5E3C' }}>Paid Amount</th>
                              <th style={{ textAlign: 'right', fontWeight: 'bold', color: '#8B5E3C' }}>Interest</th>
                              <th style={{ textAlign: 'right', fontWeight: 'bold', color: '#8B5E3C' }}>Remaining Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {processedLoans.map((loan) => {
                              const isExpanded = expandedLoanId === loan.id;
                              return (
                                <React.Fragment key={loan.id}>
                                  <tr 
                                    onClick={() => loan.status === 'approved' && toggleExpandLoan(loan.id)}
                                    style={{ cursor: loan.status === 'approved' ? 'pointer' : 'default' }}
                                    className="align-middle"
                                  >
                                    <td style={{ textAlign: 'left' }}>
                                      {formatDate(loan.requested_date || loan.created_at)}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCur(loan.amount_requested)}</td>
                                    <td style={{ textAlign: 'right', color: '#385723', fontWeight: 'bold' }}>{formatCur(loan.asalPaid)}</td>
                                    <td style={{ textAlign: 'right', color: '#7f6000' }}>{formatCur(loan.interestPaid)}</td>
                                    <td style={{ textAlign: 'right', color: '#c65911', fontWeight: 'bold' }}>
                                      <div className="d-flex align-items-center justify-content-end gap-1">
                                        <span>{formatCur(loan.remainingBalance)}</span>
                                        {loan.status === 'approved' && (
                                          <span className="text-muted shadow-sm" style={{ fontSize: '10px' }}>
                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                  
                                  {/* Repayments subtable row */}
                                  {isExpanded && loan.status === 'approved' && (
                                    <tr>
                                      <td colSpan={5} className="p-3 bg-light">
                                        <div className="p-3 bg-white rounded-3 border border-light">
                                          <h6 className="small fw-extrabold text-brown mb-2.5">Repayment Transaction Logs</h6>
                                          {loan.paymentHistory.length === 0 ? (
                                            <div className="text-muted small text-center py-2 italic">
                                              No repayments recorded for this active loan yet.
                                            </div>
                                          ) : (
                                            <table className="table table-sm table-bordered text-start m-0" style={{ fontSize: '12px' }}>
                                              <thead>
                                                <tr style={{ background: '#FAF7F2' }}>
                                                  <th style={{ textAlign: 'left', color: '#8B5E3C' }}>Payment Date</th>
                                                  <th style={{ textAlign: 'right', color: '#8B5E3C' }}>Paid (Total)</th>
                                                  <th style={{ textAlign: 'right', color: '#8B5E3C' }}>Interest (Vatti)</th>
                                                  <th style={{ textAlign: 'right', color: '#8B5E3C' }}>Principal (Asal)</th>
                                                  <th style={{ textAlign: 'right', color: '#8B5E3C' }}>New Balance</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {loan.paymentHistory.map(rep => (
                                                  <tr key={rep.id}>
                                                    <td style={{ textAlign: 'left' }}>{formatDate(rep.transaction_date)}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#8B5E3C' }}>{formatCur(rep.total_paid)}</td>
                                                    <td style={{ textAlign: 'right', color: '#c00000' }}>{formatCur(rep.vatti_amount)}</td>
                                                    <td style={{ textAlign: 'right', color: '#385723' }}>{formatCur(rep.asal_amount)}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCur(rep.remaining_balance)}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberDetails;
