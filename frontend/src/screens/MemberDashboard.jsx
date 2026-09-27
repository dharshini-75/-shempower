import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  PiggyBank, 
  HandCoins, 
  Wallet,
  CheckCircle2,
  Megaphone,
  MessageSquare,
  X,
  Send,
  PlusCircle,
  FileText,
  BookOpen,
  Bell,
  Receipt,
  Clock,
  PhoneCall,
  CreditCard,
  TrendingDown,
  ShieldCheck
} from 'lucide-react';
import { downloadPDFStatement } from '../utils/downloadHelper';
import UPIPaymentModal from '../components/UPIPaymentModal';

const MemberDashboard = () => {
  const navigate = useNavigate();
  const { user, t, language } = useAuth();

  const formatCur = (num) => `₹${Math.round(Number(num || 0)).toLocaleString('en-IN')}`;

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (_) {
      return String(dateStr);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return { date: '-', time: '-' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { date: String(dateStr), time: '' };
      return {
        date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      };
    } catch (_) {
      return { date: String(dateStr), time: '' };
    }
  };

  const { 
    summary, 
    notices, 
    notifications,
    fetchNotifications,
    markNotificationRead,
    fetchSummary, 
    fetchNotices, 
    passbook, 
    fetchPassbook,
    myLoans,
    fetchMyLoans,
    chatMessages,
    fetchChat,
    sendChat,
    addTransaction,
    getMathPreview,
    token
  } = useFinancial();
  
  // Modal visibility states
  const [showChat, setShowChat] = useState(false);
  const [showNotices, setShowNotices] = useState(false);
  const [chatMessageText, setChatMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [callLeaderError, setCallLeaderError] = useState('');

  // Payment & UPI modal states
  const [showSavingsInputModal, setShowSavingsInputModal] = useState(false);
  const [showLoanInputModal, setShowLoanInputModal] = useState(false);
  const [savingsPaymentAmount, setSavingsPaymentAmount] = useState('');
  const [loanRepaymentAmount, setLoanRepaymentAmount] = useState('');
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [upiType, setUpiType] = useState('savings');
  const [upiAmount, setUpiAmount] = useState(0);
  const [paymentSuccessAlert, setPaymentSuccessAlert] = useState('');

  // Downloading state
  const [savingsPdfDownloading, setSavingsPdfDownloading] = useState(false);
  const [loanPdfDownloading, setLoanPdfDownloading] = useState(false);
  const [downloadAlert, setDownloadAlert] = useState({ show: false, message: '', isError: false });

  // Initial Data Fetch Effect
  useEffect(() => {
    fetchSummary();
    fetchNotices();
    fetchNotifications();
    fetchPassbook();
    fetchMyLoans();
    fetchChat();
  }, []);

  // Compute Running Savings Passbook Data
  const savingsData = useMemo(() => {
    if (!passbook || passbook.length === 0) return [];
    
    // Sort oldest first to calculate running balance correctly
    const deposits = [...passbook]
      .filter(item => item.transaction_type === 'deposit' || item.transaction_type === 'withdrawal')
      .sort((a, b) => {
        const timeA = new Date(a.transaction_date || a.created_at || 0).getTime();
        const timeB = new Date(b.transaction_date || b.created_at || 0).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return (a.id || 0) - (b.id || 0);
      });
      
    let running = 0;
    const processed = deposits.map((item) => {
        const amt = Number(item.total_paid || item.amount || 0);
        running += (item.transaction_type === 'withdrawal' ? -amt : amt);
        return {
          ...item,
          runningSavings: running
        };
    });
    
    // Return newest first for the UI (latest transaction at TOP)
    return processed.reverse();
  }, [passbook]);

  // Compute Loan Repayments Data (Newest First)
  const loanRepayments = useMemo(() => {
    return (passbook || [])
      .filter(item => item.transaction_type === 'repayment')
      .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
  }, [passbook]);

  // Compute Processed Loans Data
  const processedLoans = useMemo(() => {
    return (myLoans || [])
      .filter((loan) => loan.status === 'approved')
      .map((loan) => {
      const req = Number(loan.amount_requested || 0);
      const asal = Number(loan.asalPaid || loan.principal_paid || 0);
      const interest = Number(loan.interestPaid || loan.vattiPaid || 0);
      const rem = loan.remainingBalance !== undefined ? Number(loan.remainingBalance) : Math.max(0, req - asal);
      return {
        ...loan,
        asalPaid: asal,
        interestPaid: interest,
        remainingBalance: rem
      };
    });
  }, [myLoans]);

  // Compute Combined Financial Metrics
  const financialMetrics = useMemo(() => {
    const totalSavings = savingsData.length > 0 ? savingsData[0].runningSavings : Number(summary?.personalSavings || summary?.mySavings || 0);
    const activeLoan = processedLoans.find(l => l.status === 'approved' && l.remainingBalance > 0) || processedLoans[0] || null;
    
    let totalLoanAmount = 0;
    let amountPaid = 0;
    let interestPaid = 0;
    let remainingLoan = 0;

    processedLoans.forEach(l => {
      if (l.status === 'approved') {
        totalLoanAmount += Number(l.amount_requested || 0);
        amountPaid += Number(l.asalPaid || 0);
        interestPaid += Number(l.interestPaid || 0);
        remainingLoan += Number(l.remainingBalance || 0);
      }
    });

    if (totalLoanAmount === 0 && summary) {
      totalLoanAmount = Number(summary.activeLoanAmount || 0);
      amountPaid = Number(summary.activeAmountPaid || 0);
      interestPaid = Number(summary.activeInterestPaid || 0);
      remainingLoan = Number(summary.activeRemainingLoan || summary.personalOutstanding || summary.myLoanOutstanding || 0);
    }

    return {
      totalSavings,
      totalLoanAmount,
      amountPaid,
      interestPaid,
      remainingLoan,
      activeLoan
    };
  }, [savingsData, processedLoans, summary]);

  // Compute Loan Status & Action Ability Flags
  const hasPendingLoan = useMemo(() => {
    return (myLoans || []).some(l => l.status === 'pending');
  }, [myLoans]);

  const hasActiveLoan = useMemo(() => {
    return (myLoans || []).some(l => l.status === 'approved' && (l.remainingBalance > 0 || Math.max(0, Number(l.amount_requested || 0) - Number(l.asalPaid || l.principal_paid || 0)) > 0));
  }, [myLoans]);

  const canRequestLoan = useMemo(() => {
    return !hasPendingLoan && !hasActiveLoan;
  }, [hasPendingLoan, hasActiveLoan]);

  const canPayLoan = useMemo(() => {
    return financialMetrics.remainingLoan > 0 || hasActiveLoan;
  }, [financialMetrics.remainingLoan, hasActiveLoan]);

  const getTranslatedNotificationMessage = (item) => {
    if (!item) return '';
    let msg = item.message || '';
    if (language === 'ta') {
      if (msg.includes('Loan request submitted') || msg.includes('Application')) {
        return 'உங்கள் கடன் விண்ணப்பம் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது. தலைவியின் ஆய்வுக்கு நிலுவையில் உள்ளது.';
      } else if (msg.includes('approved') || msg.includes('Approved')) {
        return 'உங்கள் கடன் விண்ணப்பம் குழு தலைவியால் ஒப்புதல் அளிக்கப்பட்டுள்ளது.';
      } else if (msg.includes('rejected') || msg.includes('Rejected')) {
        return 'உங்கள் கடன் விண்ணப்பம் நிராகரிக்கப்பட்டது.';
      }
    }
    return msg;
  };

  // Compute Loan Math Engine Preview (2% reducing balance formula)
  const loanMathPreview = useMemo(() => {
    const rawAmt = Number(loanRepaymentAmount || 0);
    const currentBal = Number(financialMetrics.remainingLoan || 0);

    if (!loanRepaymentAmount || rawAmt <= 0 || currentBal <= 0 || isNaN(rawAmt)) {
      return null;
    }

    const interestRate = 0.02;
    const vattiPaid = Number((currentBal * interestRate).toFixed(2));
    let asalPaid = rawAmt - vattiPaid;
    if (asalPaid < 0) asalPaid = 0;
    if (asalPaid > currentBal) asalPaid = currentBal;
    const newBalance = Number(Math.max(0, currentBal - asalPaid).toFixed(2));

    return {
      vattiPaid,
      asalPaid: Number(asalPaid.toFixed(2)),
      newBalance
    };
  }, [loanRepaymentAmount, financialMetrics.remainingLoan]);

  // Compute Unified Loan Updates & Notifications
  const unifiedLoanUpdates = useMemo(() => {
    const list = [];
    (notifications || []).forEach((n) => {
      list.push({
        id: 'notif-' + (n.id || Math.random()),
        title: n.title || 'Notification',
        message: n.message || '',
        status: n.status || 'info',
        created_at: n.created_at || n.date,
        is_read: n.is_read || false
      });
    });
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [notifications]);

  // Handlers
  const handleCallLeader = () => {
    const leaderName = user?.assigned_leader_name || 'Group Leader (Hema)';
    const leaderMobile = user?.assigned_leader_mobile || '9876543210';
    try {
      window.location.href = `tel:${leaderMobile}`;
    } catch (_) {
      setCallLeaderError(`Call leader ${leaderName} at ${leaderMobile}`);
    }
  };

  const handleProceedSavingsUPI = () => {
    const amt = Number(savingsPaymentAmount);
    if (!amt || amt <= 0) return;
    setUpiType('savings');
    setUpiAmount(amt);
    setShowSavingsInputModal(false);
    setShowUPIModal(true);
  };

  const handleProceedLoanUPI = () => {
    const amt = Number(loanRepaymentAmount);
    if (!amt || amt <= 0) return;
    setUpiType('loan');
    setUpiAmount(amt);
    setShowLoanInputModal(false);
    setShowUPIModal(true);
  };

  const handleCloseUPIModal = () => {
    setShowUPIModal(false);
    if (upiType === 'loan') {
      setShowLoanInputModal(true);
    } else if (upiType === 'savings') {
      setShowSavingsInputModal(true);
    }
  };

  const handleConfirmUPIPayment = async (paymentDetails) => {
    setShowUPIModal(false);
    // Payment submitted to leader for verification via /api/ledger/submit-upi (called inside modal)
    // Only show pending alert — do NOT record ledger entry here
    setSavingsPaymentAmount('');
    setLoanRepaymentAmount('');
    setPaymentSuccessAlert('✅ Payment submitted! Awaiting leader verification.');
    setTimeout(() => setPaymentSuccessAlert(''), 6000);
    fetchNotifications();
  };


  // Handle PDF Download for Member Savings
  const handleDownloadSavingsPDF = async () => {
    if (!user) return;
    setSavingsPdfDownloading(true);
    setDownloadAlert({ show: false, message: '', isError: false });
    const memberName = user.full_name;
    const memberId = user.id;
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
        const msg = language === 'ta' ? 'PDF வெற்றிகரமாகப் பதிவிறக்கப்பட்டது.' : 'PDF downloaded successfully.';
        setDownloadAlert({ show: true, message: msg, isError: false });
        setTimeout(() => setDownloadAlert({ show: false, message: '', isError: false }), 4000);
      }
    } catch (error) {
      console.error('[MemberDashboard] Savings PDF download error:', error);
      const msg = language === 'ta' ? 'PDF பதிவிறக்க முடியவில்லை.' : 'Unable to download PDF.';
      setDownloadAlert({ show: true, message: msg, isError: true });
      setTimeout(() => setDownloadAlert({ show: false, message: '', isError: false }), 4000);
    } finally {
      setSavingsPdfDownloading(false);
    }
  };

  // Handle PDF Download for Member Loans
  const handleDownloadLoanPDF = async () => {
    if (!user) return;
    setLoanPdfDownloading(true);
    setDownloadAlert({ show: false, message: '', isError: false });
    const memberName = user.full_name;
    const memberId = user.id;
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
        const msg = language === 'ta' ? 'PDF வெற்றிகரமாகப் பதிவிறக்கப்பட்டது.' : 'PDF downloaded successfully.';
        setDownloadAlert({ show: true, message: msg, isError: false });
        setTimeout(() => setDownloadAlert({ show: false, message: '', isError: false }), 4000);
      }
    } catch (error) {
      console.error('[MemberDashboard] Loan PDF download error:', error);
      const msg = language === 'ta' ? 'PDF பதிவிறக்க முடியவில்லை.' : 'Unable to download PDF.';
      setDownloadAlert({ show: true, message: msg, isError: true });
      setTimeout(() => setDownloadAlert({ show: false, message: '', isError: false }), 4000);
    } finally {
      setLoanPdfDownloading(false);
    }
  };

  // Send a chat message
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatMessageText.trim()) return;

    setIsSending(true);
    const success = await sendChat(chatMessageText);
    setIsSending(false);
    if (success) {
      setChatMessageText('');
      fetchChat();
    }
  };

  return (
    <div className="container-fluid p-0 safe-wrapper animate-fade-in" style={{ paddingBottom: '100px' }}>
      {/* Welcome Header */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <h2 className="fw-extrabold text-brown m-0" style={{ fontFamily: "'Outfit', sans-serif" }}>
            SHEmpower — {t.welcomeUser || 'Welcome'}, {user?.full_name}
          </h2>
          <p className="text-muted small m-0">{t.personalWorkspace || 'SHEmpower Member Dashboard & Passbook'}</p>
        </div>

        {/* 📞 Call Leader Action Button */}
        <button
          onClick={handleCallLeader}
          className="btn btn-brown d-flex align-items-center gap-2 px-3.5 py-2.5 shadow-sm touch-btn"
          style={{ borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' }}
          title={user?.assigned_leader_name ? `Call Leader: ${user.assigned_leader_name} (${user.assigned_leader_mobile || '9876543210'})` : t.callLeader}
        >
          <PhoneCall size={18} />
          <span>{t.callLeader || 'Call Leader'}</span>
        </button>
      </div>

      {callLeaderError && (
        <div className="alert alert-warning py-2 px-3 small rounded-3 mb-3 border-0 d-flex align-items-center gap-2">
          <span>⚠️ {callLeaderError}</span>
        </div>
      )}

      {paymentSuccessAlert && (
        <div className="alert alert-success py-3 px-4 rounded-3 mb-3 border-0 d-flex align-items-center justify-content-between gap-2 shadow-sm text-success" style={{ backgroundColor: 'var(--success-olive-light)' }}>
          <div className="d-flex align-items-center gap-2">
            <CheckCircle2 size={20} className="text-success flex-shrink-0" />
            <span className="fw-bold">{paymentSuccessAlert}</span>
          </div>
          <button type="button" className="btn-close shadow-none" onClick={() => setPaymentSuccessAlert('')} />
        </div>
      )}

      {downloadAlert.show && (
        <div className={`alert ${downloadAlert.isError ? 'alert-danger' : 'alert-success'} py-3 px-4 rounded-3 mb-3 border-0 d-flex align-items-center justify-content-between gap-2 shadow-sm`} style={{ backgroundColor: downloadAlert.isError ? 'var(--terracotta-danger-light)' : 'var(--success-olive-light)', color: downloadAlert.isError ? 'var(--terracotta-danger)' : '#2E7D32' }}>
          <div className="d-flex align-items-center gap-2">
            <CheckCircle2 size={20} className="flex-shrink-0" />
            <span className="fw-bold">{downloadAlert.message}</span>
          </div>
          <button type="button" className="btn-close shadow-none" onClick={() => setDownloadAlert({ show: false, message: '', isError: false })} />
        </div>
      )}

      <div className="animate-scale-up">
        {/* ================================================== */}
        {/* TOP SUMMARY CARDS (Requirement 4: Uniform Sizing)  */}
        {/* ================================================== */}
        <div className="row g-3 mb-4">
          {/* Card 1: Total Savings */}
          <div className="col-12 col-sm-6 col-md-4 col-xl">
            <div className="card-glass d-flex align-items-center gap-3 p-3.5 shadow-sm border border-light h-100" style={{ minHeight: '90px' }}>
              <div className="p-3 bg-light rounded-circle text-brown flex-shrink-0" style={{ border: '1px solid var(--warm-border)' }}>
                <PiggyBank size={24} />
              </div>
              <div className="overflow-hidden">
                <div className="text-muted small fw-bold uppercase tracking-wider text-truncate" style={{ fontSize: '11px' }}>
                  {t.savings}
                </div>
                <h3 className="m-0 fw-extrabold text-success text-truncate" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px' }}>
                  {formatCur(financialMetrics.totalSavings)}
                </h3>
              </div>
            </div>
          </div>

          {/* Card 2: Total Loan Amount */}
          <div className="col-12 col-sm-6 col-md-4 col-xl">
            <div className="card-glass d-flex align-items-center gap-3 p-3.5 shadow-sm border border-light h-100" style={{ minHeight: '90px' }}>
              <div className="p-3 bg-light rounded-circle text-brown flex-shrink-0" style={{ border: '1px solid var(--warm-border)' }}>
                <Wallet size={24} />
              </div>
              <div className="overflow-hidden">
                <div className="text-muted small fw-bold uppercase tracking-wider text-truncate" style={{ fontSize: '11px' }}>
                  {t.totalLoanAmount}
                </div>
                <h3 className="m-0 fw-extrabold text-brown text-truncate" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px' }}>
                  {formatCur(financialMetrics.totalLoanAmount)}
                </h3>
              </div>
            </div>
          </div>

          {/* Card 3: Amount Paid */}
          <div className="col-12 col-sm-6 col-md-4 col-xl">
            <div className="card-glass d-flex align-items-center gap-3 p-3.5 shadow-sm border border-light h-100" style={{ minHeight: '90px' }}>
              <div className="p-3 bg-light rounded-circle text-brown flex-shrink-0" style={{ border: '1px solid var(--warm-border)' }}>
                <CheckCircle2 size={24} />
              </div>
              <div className="overflow-hidden">
                <div className="text-muted small fw-bold uppercase tracking-wider text-truncate" style={{ fontSize: '11px' }}>
                  {t.amountPaid}
                </div>
                <h3 className="m-0 fw-extrabold text-info text-truncate" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px' }}>
                  {formatCur(financialMetrics.amountPaid)}
                </h3>
              </div>
            </div>
          </div>

          {/* Card 4: Interest Paid */}
          <div className="col-12 col-sm-6 col-md-4 col-xl">
            <div className="card-glass d-flex align-items-center gap-3 p-3.5 shadow-sm border border-light h-100" style={{ minHeight: '90px' }}>
              <div className="p-3 bg-light rounded-circle text-brown flex-shrink-0" style={{ border: '1px solid var(--warm-border)' }}>
                <Receipt size={24} />
              </div>
              <div className="overflow-hidden">
                <div className="text-muted small fw-bold uppercase tracking-wider text-truncate" style={{ fontSize: '11px' }}>
                  {t.interestPaid}
                </div>
                <h3 className="m-0 fw-extrabold text-primary text-truncate" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px' }}>
                  {formatCur(financialMetrics.interestPaid)}
                </h3>
              </div>
            </div>
          </div>

          {/* Card 5: Remaining Loan */}
          <div className="col-12 col-sm-6 col-md-4 col-xl">
            <div className="card-glass d-flex align-items-center gap-3 p-3.5 shadow-sm border border-light h-100" style={{ minHeight: '90px' }}>
              <div className="p-3 bg-light rounded-circle text-brown flex-shrink-0" style={{ border: '1px solid var(--warm-border)' }}>
                <HandCoins size={24} />
              </div>
              <div className="overflow-hidden">
                <div className="text-muted small fw-bold uppercase tracking-wider text-truncate" style={{ fontSize: '11px' }}>
                  {t.remainingLoan}
                </div>
                <h3 className="m-0 fw-extrabold text-danger text-truncate" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px' }}>
                  {formatCur(financialMetrics.remainingLoan)}
                </h3>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================== */}
        {/* SINGLE UNIFIED LOAN UPDATES & NOTIFICATIONS        */}
        {/* ================================================== */}
        <div className="card-glass p-4 mb-4 shadow-sm border border-light">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div className="d-flex align-items-center gap-2">
              <div className="position-relative">
                <Bell size={20} className="text-brown" />
                {unifiedLoanUpdates.some(u => !u.is_read) && (
                  <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
                    <span className="visually-hidden">New update</span>
                  </span>
                )}
              </div>
              <h5 className="m-0 fw-bold text-brown" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '16px' }}>
                {t.loanUpdatesNotifications || 'Loan Updates & Notifications'}
              </h5>
              {unifiedLoanUpdates.length > 0 && (
                <span className="badge bg-brown text-white rounded-pill ms-1" style={{ fontSize: '11px' }}>
                  {unifiedLoanUpdates.length} Updates
                </span>
              )}
            </div>
          </div>

          {unifiedLoanUpdates.length === 0 ? (
            <div className="text-center text-muted py-3 small border border-dashed rounded-3" style={{ background: '#FAF7F2' }}>
              🔔 {t.noUpdatesYet || 'No notifications yet.'}
            </div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {unifiedLoanUpdates.map((u) => {
                const dt = formatDateTime(u.created_at);
                const isUnread = !u.is_read;
                
                // Determine icon based on title
                let iconSymbol = '🔔';
                if (u.title.toLowerCase().includes('payment')) iconSymbol = '💰';
                if (u.title.toLowerCase().includes('approved')) iconSymbol = '✅';
                if (u.title.toLowerCase().includes('rejected')) iconSymbol = '❌';

                return (
                  <div 
                    key={u.id}
                    onClick={() => { if (isUnread) markNotificationRead(u.id.replace('notif-', '')); }}
                    className={`p-3 d-flex gap-3 align-items-start transition-all cursor-pointer border-bottom ${isUnread ? 'bg-light' : 'bg-white'}`}
                    style={{ cursor: isUnread ? 'pointer' : 'default' }}
                  >
                    <div className="flex-shrink-0 mt-1" style={{ fontSize: '20px' }}>
                      {iconSymbol}
                    </div>
                    <div className="flex-grow-1 overflow-hidden">
                      <div className="d-flex justify-content-between align-items-baseline mb-1 gap-2">
                        <strong className={`text-truncate ${isUnread ? 'text-dark fw-bold' : 'text-muted fw-semibold'}`} style={{ fontSize: '15px' }}>
                          {u.title}
                        </strong>
                        <span className="text-muted flex-shrink-0" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                          {dt.date}, {dt.time}
                        </span>
                      </div>
                      <p className={`m-0 ${isUnread ? 'text-dark fw-semibold' : 'text-muted'}`} style={{ fontSize: '13.5px', lineHeight: '1.4' }}>
                        {u.message}
                      </p>
                    </div>
                    {isUnread && (
                      <div className="flex-shrink-0 align-self-center">
                        <span className="d-inline-block bg-success rounded-circle" style={{ width: '10px', height: '10px' }}></span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions Panel */}
        <div className="card-glass p-4 mb-4">
          <h5 className="fw-bold mb-3 text-brown" style={{ fontSize: '15px', fontFamily: "'Outfit', sans-serif" }}>
            {t.quickActions || 'Quick Actions'}
          </h5>
          <div className="row g-3">
            {/* 💰 Add Savings Action */}
            <div className="col-6 col-md-3 d-flex">
              <button 
                onClick={() => setShowSavingsInputModal(true)}
                className="btn btn-outline-success w-100 h-100 py-3 d-flex flex-column align-items-center justify-content-center gap-1.5 border-2 shadow-sm touch-button"
                style={{ borderRadius: '16px', padding: '14px 8px', backgroundColor: '#F4FBF7', borderColor: '#2E7D32', minHeight: '100px' }}
              >
                <span style={{ fontSize: '20px' }}>💰</span>
                <strong style={{ fontSize: '12px', color: '#1B5E20', textAlign: 'center', lineHeight: '1.2' }}>
                  {language === 'ta' ? 'சேமிப்பு சேர்' : 'Add Savings'}
                </strong>
              </button>
            </div>

            {/* 🏦 Pay Loan Amount — always visible, disabled unless active approved loan exists */}
            <div className="col-6 col-md-3 d-flex">
              <button
                onClick={() => {
                  if (!canPayLoan) return;
                  const defaultAmount = financialMetrics.remainingLoan > 0 ? String(Math.min(600, Math.round(financialMetrics.remainingLoan))) : '';
                  setLoanRepaymentAmount(defaultAmount);
                  setShowLoanInputModal(true);
                }}
                disabled={!canPayLoan}
                title={
                  hasPendingLoan
                    ? (language === 'ta' ? 'கடன் கோரிக்கை ஒப்புதலுக்காக காத்திருக்கிறது' : 'Loan request pending approval')
                    : !hasActiveLoan
                      ? (language === 'ta' ? 'செயலில் உள்ள கடன் இல்லை' : 'No active loan')
                      : (language === 'ta' ? 'கடனை திருப்பிச் செலுத்து' : 'Repay your loan')
                }
                className="btn w-100 h-100 py-3 d-flex flex-column align-items-center justify-content-center gap-1 border-2 shadow-sm touch-button"
                style={{
                  borderRadius: '16px',
                  padding: '14px 8px',
                  backgroundColor: canPayLoan ? '#FDF2F0' : '#F5F5F5',
                  borderColor: canPayLoan ? '#C62828' : '#BDBDBD',
                  color: canPayLoan ? '#B71C1C' : '#9E9E9E',
                  opacity: canPayLoan ? 1 : 0.6,
                  cursor: canPayLoan ? 'pointer' : 'not-allowed',
                  minHeight: '100px'
                }}
              >
                <span style={{ fontSize: '20px' }}>🏦</span>
                <strong style={{ fontSize: '12px', textAlign: 'center', lineHeight: '1.2' }}>
                  {language === 'ta' ? 'கடன் தொகை செலுத்து' : 'Pay Loan Amount'}
                </strong>
                {!canPayLoan && (
                  <span style={{ fontSize: '10px', fontWeight: 'normal', opacity: 0.8, lineHeight: '1' }}>
                    {hasPendingLoan
                      ? (language === 'ta' ? '(நிலுவையில்)' : '(Pending)')
                      : (language === 'ta' ? '(கடன் இல்லை)' : '(No Loan)')}
                  </span>
                )}
              </button>
            </div>

            {/* Apply Loan Action */}
            <div className="col-6 col-md-3 d-flex">
              <button 
                onClick={() => canRequestLoan && navigate('/member/request-loan')}
                disabled={!canRequestLoan}
                title={hasActiveLoan ? 'You have an active loan' : hasPendingLoan ? 'Loan request pending' : ''}
                className={`btn w-100 h-100 py-3 d-flex flex-column align-items-center justify-content-center gap-1.5 border-2 shadow-sm touch-button ${canRequestLoan ? 'btn-outline-brown' : 'btn-outline-secondary'}`}
                style={{ borderRadius: '16px', padding: '14px 8px', opacity: canRequestLoan ? 1 : 0.55, minHeight: '100px' }}
              >
                <PlusCircle size={20} />
                <strong style={{ fontSize: '12px', textAlign: 'center', lineHeight: '1.2' }}>{t.applyLoan}</strong>
              </button>
            </div>

            {/* Group Chat Action */}
            <div className="col-6 col-md-3 d-flex">
              <button 
                onClick={() => setShowChat(true)} 
                className="btn btn-outline-brown w-100 h-100 py-3 d-flex flex-column align-items-center justify-content-center gap-1.5 border-2 shadow-sm touch-button"
                style={{ borderRadius: '16px', padding: '14px 8px', minHeight: '100px' }}
              >
                <MessageSquare size={20} />
                <strong style={{ fontSize: '12px', textAlign: 'center', lineHeight: '1.2' }}>{t.groupChat}</strong>
              </button>
            </div>

            {/* Notice Board Action */}
            <div className="col-12">
              <button 
                onClick={() => navigate('/notices')} 
                className="btn btn-outline-brown w-100 py-3 d-flex align-items-center justify-content-center gap-2 border-2 shadow-sm touch-button"
                style={{ borderRadius: '16px', padding: '14px 8px', minHeight: '52px' }}
              >
                <Megaphone size={20} />
                <strong style={{ fontSize: '12px', textAlign: 'center' }}>{t.noticeBoard}</strong>
              </button>
            </div>
          </div>
        </div>

        {/* ================================================== */}
        {/* MEMBER SAVINGS PASSBOOK SECTION (Requirement 5 & 7) */}
        {/* ================================================== */}
        <div className="card-glass p-4 mb-4 shadow-sm border border-light">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2.5 mb-3">
            <div className="d-flex align-items-center gap-2">
              <BookOpen className="text-brown" size={20} />
              <h5 className="m-0 fw-bold text-brown" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '16px' }}>
                {t.savingsPassbook}
              </h5>
            </div>

            <div className="d-flex align-items-center gap-2">
              <button 
                onClick={() => setShowSavingsInputModal(true)}
                className="btn btn-success btn-sm d-flex align-items-center gap-1.5 px-3 py-2 shadow-sm touch-btn border-0"
                style={{ borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#2E7D32' }}
              >
                <span>💰 {language === 'ta' ? 'சேமிப்பு சேர்' : 'Add Savings'}</span>
              </button>
              <button 
                onClick={handleDownloadSavingsPDF}
                disabled={savingsPdfDownloading}
                className="btn btn-brown btn-sm d-flex align-items-center gap-1.5 px-3 py-2 shadow-sm touch-btn"
                style={{ borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', pointerEvents: 'auto' }}
              >
                <FileText size={14} />
                <span>{savingsPdfDownloading ? (t.preparing || 'Preparing...') : (t.downloadSavingsPDF || 'Download Savings PDF')}</span>
              </button>
            </div>
          </div>

          <div className="table-responsive">
            {savingsData.length === 0 ? (
              <div className="text-center text-muted py-4 small border border-dashed rounded-3">
                {t.noSavingsFound}
              </div>
            ) : (
              <table className="table table-bordered table-warm text-start m-0" style={{ minWidth: '450px', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#FAF7F2' }}>
                    <th style={{ color: '#8B5E3C', textAlign: 'left', fontWeight: 'bold' }}>{t.date}</th>
                    <th style={{ color: '#8B5E3C', textAlign: 'right', fontWeight: 'bold' }}>{t.deposit}</th>
                    <th style={{ color: '#8B5E3C', textAlign: 'right', fontWeight: 'bold' }}>{t.balance}</th>
                  </tr>
                </thead>
                <tbody>
                  {savingsData.map((e) => (
                    <tr key={e.id}>
                      <td style={{ textAlign: 'left' }}>{formatDate(e.transaction_date)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#385723' }}>+{formatCur(e.total_paid)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#8B5E3C' }}>{formatCur(e.runningSavings)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ================================================== */}
        {/* MEMBER LOAN RECORDS SECTION (Requirement 5 & 6)    */}
        {/* ================================================== */}
        <div className="card-glass p-4 mb-4 shadow-sm border border-light">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2.5 mb-3">
            <div className="d-flex align-items-center gap-2">
              <HandCoins className="text-brown" size={20} />
              <h5 className="m-0 fw-bold text-brown" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '16px' }}>
                {t.loanRecords}
              </h5>
            </div>

            <div className="d-flex align-items-center gap-2">
              {canPayLoan && (
                <button 
                  onClick={() => {
                    const defaultAmount = financialMetrics.remainingLoan > 0 ? String(Math.min(600, Math.round(financialMetrics.remainingLoan))) : '';
                    setLoanRepaymentAmount(defaultAmount);
                    setShowLoanInputModal(true);
                  }}
                  className="btn btn-danger btn-sm d-flex align-items-center gap-1.5 px-3 py-2 shadow-sm touch-btn border-0"
                  style={{ borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#C62828' }}
                >
                  <span>🏦 Pay Loan Amount</span>
                </button>
              )}
              <button 
                onClick={handleDownloadLoanPDF}
                disabled={loanPdfDownloading}
                className="btn btn-brown btn-sm d-flex align-items-center gap-1.5 px-3 py-2 shadow-sm touch-btn"
                style={{ borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', pointerEvents: 'auto' }}
              >
                <FileText size={14} />
                <span>{loanPdfDownloading ? (t.preparing || 'Preparing...') : (t.downloadLoanPDF || 'Download Loan PDF')}</span>
              </button>
            </div>
          </div>

          <div className="table-responsive">
            {processedLoans.length === 0 ? (
              <div className="text-center text-muted py-4 small border border-dashed rounded-3">
                {t.noLoansFound}
              </div>
            ) : (
              <table className="table table-bordered table-warm text-start m-0" style={{ minWidth: '600px', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#FAF7F2' }}>
                    <th style={{ color: '#8B5E3C', textAlign: 'left', fontWeight: 'bold' }}>{t.date}</th>
                    <th style={{ color: '#8B5E3C', textAlign: 'right', fontWeight: 'bold' }}>{t.loanAmount}</th>
                    <th style={{ color: '#8B5E3C', textAlign: 'right', fontWeight: 'bold' }}>{t.paidAmount}</th>
                    <th style={{ color: '#8B5E3C', textAlign: 'right', fontWeight: 'bold' }}>{t.interest}</th>
                    <th style={{ color: '#8B5E3C', textAlign: 'right', fontWeight: 'bold' }}>{t.remainingBalance}</th>
                  </tr>
                </thead>
                <tbody>
                  {processedLoans.map((loan) => (
                    <tr key={loan.id}>
                      <td style={{ textAlign: 'left' }}>{formatDate(loan.requested_date || loan.created_at)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCur(loan.amount_requested)}</td>
                      <td style={{ textAlign: 'right', color: '#385723', fontWeight: 'bold' }}>{formatCur(loan.asalPaid)}</td>
                      <td style={{ textAlign: 'right', color: '#7f6000' }}>{formatCur(loan.interestPaid)}</td>
                      <td style={{ textAlign: 'right', color: '#c65911', fontWeight: 'bold' }}>{formatCur(loan.remainingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* LOAN REPAYMENT HISTORY TABLE */}
          {loanRepayments.length > 0 && (
            <div className="table-responsive mt-4">
              <h6 className="fw-bold text-brown mb-2" style={{ fontSize: '14px', fontFamily: "'Outfit', sans-serif" }}>
                {t.repaymentHistory || 'Repayment History'}
              </h6>
              <table className="table table-bordered table-warm text-start m-0" style={{ minWidth: '600px', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#FAF7F2' }}>
                    <th style={{ color: '#8B5E3C', textAlign: 'left', fontWeight: 'bold' }}>{t.date || 'Date'}</th>
                    <th style={{ color: '#8B5E3C', textAlign: 'right', fontWeight: 'bold' }}>{t.principal || 'Principal'}</th>
                    <th style={{ color: '#8B5E3C', textAlign: 'right', fontWeight: 'bold' }}>{t.interest || 'Interest'}</th>
                    <th style={{ color: '#8B5E3C', textAlign: 'right', fontWeight: 'bold' }}>{t.totalPaid || 'Total Paid'}</th>
                    <th style={{ color: '#8B5E3C', textAlign: 'right', fontWeight: 'bold' }}>{t.balance || 'Balance'}</th>
                  </tr>
                </thead>
                <tbody>
                  {loanRepayments.map((rep) => (
                    <tr key={rep.id}>
                      <td style={{ textAlign: 'left' }}>{formatDate(rep.transaction_date)}</td>
                      <td style={{ textAlign: 'right', color: '#385723', fontWeight: 'bold' }}>+{formatCur(rep.asal_amount)}</td>
                      <td style={{ textAlign: 'right', color: '#7f6000' }}>+{formatCur(rep.vatti_amount)}</td>
                      <td style={{ textAlign: 'right', color: '#111', fontWeight: 'bold' }}>{formatCur(rep.total_paid)}</td>
                      <td style={{ textAlign: 'right', color: '#c65911', fontWeight: 'bold' }}>{formatCur(rep.remaining_balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Notice Board Preview */}
        <div className="card-glass p-4 mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold m-0 text-brown" style={{ fontSize: '15px', fontFamily: "'Outfit', sans-serif" }}>
              {t.recentAnnouncements}
            </h5>
            <button onClick={() => setShowNotices(true)} className="btn btn-link p-0 text-decoration-none small text-brown fw-bold">
              {t.seeAll}
            </button>
          </div>
          {notices.length === 0 ? (
            <div className="text-center text-muted py-4 small">
              {t.noAnnouncements}
            </div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {notices.slice(0, 2).map((n) => (
                <div key={n.id} className="p-3 rounded bg-light border border-light shadow-sm">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <strong className="text-dark" style={{ fontSize: '13px' }}>{n.title}</strong>
                    <span className="text-muted" style={{ fontSize: '9px' }}>
                      {formatDate(n.created_at)}
                    </span>
                  </div>
                  <p className="text-muted small m-0" style={{ fontSize: '11px', lineHeight: '1.4' }}>{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- IN-PAGE MODALS FOR CHAT AND NOTICES --- */}
      
      {/* Group Chat Modal */}
      {showChat && (
        <div className="modal-backdrop-warm d-flex align-items-center justify-content-center animate-fade-in" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050, padding: '15px'
        }}>
          <div className="card-glass d-flex flex-column p-0 overflow-hidden shadow-lg animate-scale-up" style={{
            width: '100%', maxWidth: '500px', height: '80vh', borderRadius: '24px'
          }}>
            {/* Modal Header */}
            <div className="p-3.5 border-bottom d-flex justify-content-between align-items-center bg-light">
              <div className="d-flex align-items-center gap-2">
                <MessageSquare className="text-brown" />
                <h5 className="m-0 fw-bold text-brown" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '15px' }}>{t.shgGroupChat}</h5>
              </div>
              <button onClick={() => setShowChat(false)} className="btn btn-sm btn-link p-0 text-muted d-flex align-items-center justify-content-center">
                <X size={22} />
              </button>
            </div>

            {/* Chat Body messages */}
            <div className="flex-grow-1 p-3 overflow-auto d-flex flex-column gap-3 bg-warm-cream">
              {chatMessages.length === 0 ? (
                <div className="text-center text-muted my-auto">
                  <MessageSquare size={35} className="mb-2 opacity-50 text-brown" />
                  <div className="small fw-semibold">{t.noAnnouncements}</div>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = Number(msg.senderId) === Number(user?.id);
                  const hasAudio = msg.audioUrl || (msg.message && msg.message.startsWith('data:audio'));
                  return (
                    <div key={msg.id} className={`d-flex ${isMe ? 'justify-content-end' : 'justify-content-start'}`}>
                      <div className="p-3 rounded-3 shadow-sm border" style={{
                        maxWidth: '85%',
                        backgroundColor: isMe ? '#FAF3EB' : '#FFFFFF',
                        color: '#111111',
                        borderRadius: isMe ? '16px 16px 0 16px' : '16px 16px 16px 0',
                        borderColor: isMe ? '#D4B996' : '#E0E0E0'
                      }}>
                        <div className="fw-bold mb-1" style={{ fontSize: '10px', color: '#111111' }}>
                          {msg.senderName} {msg.senderRole === 'leader' ? '👑 (Leader)' : '(Member)'}
                        </div>
                        {hasAudio ? (
                          <div className="p-2 bg-light rounded border border-secondary border-opacity-25" style={{ fontSize: '12px', color: '#111111' }}>
                            <audio controls src={msg.audioUrl || msg.message} style={{ width: '100%', height: '32px' }} />
                          </div>
                        ) : (
                          <p className="m-0 fw-semibold" style={{ fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: '1.4', color: '#111111' }}>{msg.message}</p>
                        )}
                        <div className="text-end mt-1 font-weight-bold" style={{ fontSize: '8.5px', color: '#444444' }}>
                          {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Modal Input Footer */}
            <form onSubmit={handleSendChat} className="p-3 border-top bg-light d-flex gap-2">
              <input 
                type="text"
                value={chatMessageText}
                onChange={(e) => setChatMessageText(e.target.value)}
                placeholder={t.typeMessage}
                className="form-control form-control-warm touch-input py-2"
                maxLength={400}
                style={{ fontSize: '14px' }}
              />
              <button 
                type="submit" 
                disabled={isSending || !chatMessageText.trim()}
                className="btn btn-brown px-3 d-flex align-items-center justify-content-center"
                style={{ borderRadius: '12px', minWidth: '48px' }}
              >
                {isSending ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : (
                  <Send size={16} />
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Notice Board Modal */}
      {showNotices && (
        <div className="modal-backdrop-warm d-flex align-items-center justify-content-center animate-fade-in" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050, padding: '15px'
        }}>
          <div className="card-glass d-flex flex-column p-0 overflow-hidden shadow-lg animate-scale-up" style={{
            width: '100%', maxWidth: '550px', maxHeight: '75vh', borderRadius: '24px'
          }}>
            {/* Header */}
            <div className="p-3.5 border-bottom d-flex justify-content-between align-items-center bg-light">
              <div className="d-flex align-items-center gap-2">
                <Megaphone className="text-brown" />
                <h5 className="m-0 fw-bold text-brown" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '15px' }}>{t.noticeBoard}</h5>
              </div>
              <button onClick={() => setShowNotices(false)} className="btn btn-sm btn-link p-0 text-muted d-flex align-items-center justify-content-center">
                <X size={22} />
              </button>
            </div>

            {/* Notices Content */}
            <div className="p-3 overflow-auto bg-warm-cream d-flex flex-column gap-2.5" style={{ minHeight: '200px' }}>
              {notices.length === 0 ? (
                <div className="text-center text-muted py-5 my-auto">
                  <Megaphone size={35} className="mb-2 opacity-50 text-brown" />
                  <div className="small fw-semibold">{t.noAnnouncements}</div>
                </div>
              ) : (
                notices.map((n) => (
                  <div key={n.id} className="p-3 rounded-3 bg-white border shadow-sm">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <strong className="text-brown" style={{ fontSize: '13px' }}>{n.title}</strong>
                      <span className="text-muted" style={{ fontSize: '9px' }}>
                        {formatDate(n.created_at)}
                      </span>
                    </div>
                    <p className="text-muted small m-0" style={{ fontSize: '11.5px', lineHeight: '1.4' }}>{n.message}</p>
                    {n.meeting_datetime && (
                      <div className="mt-2 p-2 rounded-3 bg-light text-brown font-weight-bold border-start border-brown border-3" style={{ fontSize: '10.5px' }}>
                        {t.meetingSchedule}: {new Date(n.meeting_datetime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* SAVINGS AMOUNT INPUT MODAL */}
      {showSavingsInputModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(25, 18, 12, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '420px' }}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '24px', overflow: 'hidden' }}>
              <div className="p-3.5 px-4 text-white d-flex align-items-center justify-content-between" style={{ background: 'linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)' }}>
                <div className="d-flex align-items-center gap-2">
                  <span style={{ fontSize: '22px' }}>💰</span>
                  <h6 className="fw-bold m-0 text-white">Add SHG Savings Deposit</h6>
                </div>
                <button type="button" className="btn-close btn-close-white shadow-none" onClick={() => setShowSavingsInputModal(false)} />
              </div>
              <div className="p-4 d-flex flex-column gap-3">
                <p className="text-muted small m-0">Enter or select the savings amount you wish to deposit into your passbook.</p>
                <div>
                  <label className="form-label fw-bold text-dark mb-1" style={{ fontSize: '12px' }}>Select Preset Amount:</label>
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {['100', '300', '500', '1000', '2000'].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setSavingsPaymentAmount(amt)}
                        className={`btn btn-sm px-3 py-1.5 rounded-pill fw-bold border ${savingsPaymentAmount === amt ? 'btn-success text-white' : 'btn-outline-secondary'}`}
                        style={{ fontSize: '12px' }}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                  <label className="form-label fw-bold text-dark mb-1" style={{ fontSize: '12px' }}>Enter Custom Savings Amount (₹):</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0 fw-bold">₹</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 300"
                      value={savingsPaymentAmount}
                      onChange={(e) => setSavingsPaymentAmount(e.target.value)}
                      className="form-control form-control-warm touch-input py-2 border-start-0 fw-bold"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                </div>

                <div className="d-flex flex-column gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleProceedSavingsUPI}
                    disabled={!savingsPaymentAmount || Number(savingsPaymentAmount) <= 0}
                    className="btn btn-success w-100 py-3 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-3 border-0 shadow-sm"
                    style={{ backgroundColor: '#2E7D32', fontSize: '14px' }}
                  >
                    <CreditCard size={18} />
                    <span>Pay via UPI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSavingsInputModal(false)}
                    className="btn btn-link text-muted text-decoration-none small border-0"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOAN REPAYMENT INPUT MODAL */}
      {showLoanInputModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(25, 18, 12, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px' }}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '24px', overflow: 'hidden' }}>
              <div className="p-3.5 px-4 text-white d-flex align-items-center justify-content-between" style={{ background: 'linear-gradient(135deg, #7A2818 0%, #9E3825 100%)' }}>
                <div className="d-flex align-items-center gap-2">
                  <span style={{ fontSize: '22px' }}>🏦</span>
                  <h6 className="fw-bold m-0 text-white">Pay Micro-Loan Amount</h6>
                </div>
                <button type="button" className="btn-close btn-close-white shadow-none" onClick={() => setShowLoanInputModal(false)} />
              </div>
              <div className="p-4 d-flex flex-column gap-3">
                <div className="p-3 rounded-3 border" style={{ backgroundColor: '#FDF7F2', borderColor: 'var(--warm-border)' }}>
                  <div className="d-flex justify-content-between align-items-center small text-muted">
                    <span>Active Remaining Loan:</span>
                    <strong className="text-danger fw-extrabold" style={{ fontSize: '15px' }}>{formatCur(financialMetrics.remainingLoan)}</strong>
                  </div>
                </div>

                <div>
                  <label className="form-label fw-bold text-dark mb-1" style={{ fontSize: '12px' }}>Enter Payment Amount (₹):</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0 fw-bold">₹</span>
                    <input
                      type="number"
                      min="1"
                      max={financialMetrics.remainingLoan || 99999}
                      placeholder="e.g. 580"
                      value={loanRepaymentAmount}
                      onChange={(e) => setLoanRepaymentAmount(e.target.value)}
                      className="form-control form-control-warm touch-input py-2 border-start-0 fw-bold"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  <div className="form-text text-muted mt-1" style={{ fontSize: '11px' }}>
                    Note: Repayment automatically executes 2% reducing balance interest split.
                  </div>
                </div>

                {/* Math Engine Preview */}
                {loanMathPreview && (
                  <div className="p-3 rounded-3 border bg-light" style={{ fontSize: '12px' }}>
                    <div className="d-flex align-items-center gap-1.5 mb-2 text-brown fw-bold">
                      <TrendingDown size={14} />
                      <span>Interest Split Preview</span>
                    </div>
                    <div className="d-flex justify-content-between py-1 border-bottom">
                      <span className="text-muted">Interest Paid (Vatti 2%):</span>
                      <span className="fw-semibold text-danger">+{formatCur(loanMathPreview.vattiPaid)}</span>
                    </div>
                    <div className="d-flex justify-content-between py-1 border-bottom">
                      <span className="text-muted">Principal Repaid (Asal):</span>
                      <span className="fw-semibold text-success">-{formatCur(loanMathPreview.asalPaid)}</span>
                    </div>
                    <div className="d-flex justify-content-between pt-1.5 fw-bold">
                      <span>New Remaining Loan:</span>
                      <span className="text-brown">{formatCur(loanMathPreview.newBalance)}</span>
                    </div>
                  </div>
                )}

                <div className="d-flex flex-column gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleProceedLoanUPI}
                    disabled={!loanRepaymentAmount || Number(loanRepaymentAmount) <= 0}
                    className="btn btn-brown w-100 py-3 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-3 border-0 shadow-sm text-white"
                    style={{ background: 'linear-gradient(135deg, var(--primary-brown) 0%, #9E3825 100%)', fontSize: '14px' }}
                  >
                    <CreditCard size={18} />
                    <span>Pay via UPI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLoanInputModal(false)}
                    className="btn btn-link text-muted text-decoration-none small border-0"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPI PAYMENT GATEWAY MODAL */}
      <UPIPaymentModal
        isOpen={showUPIModal}
        onClose={handleCloseUPIModal}
        type={upiType}
        amount={upiAmount}
        mathPreview={upiType === 'loan' ? loanMathPreview : null}
        onPaymentSuccess={handleConfirmUPIPayment}
        onPaymentCancel={handleCloseUPIModal}
        t={t}
        user={user}
        token={token}
      />
    </div>
  );
};

export default MemberDashboard;
