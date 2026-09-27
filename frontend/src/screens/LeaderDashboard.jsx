import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import { 
  PiggyBank, 
  HandCoins, 
  CheckSquare, 
  PlusCircle, 
  Megaphone,
  Users,
  Calendar,
  ChevronRight,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { downloadStatement, downloadPDFStatement } from '../utils/downloadHelper';
import PaymentVerificationPanel from '../components/PaymentVerificationPanel';

const LeaderDashboard = () => {
  const navigate = useNavigate();
  const { summary, notices, members, fetchSummary, fetchNotices, fetchMembers } = useFinancial();
  const { user, t, language } = useAuth();

  useEffect(() => {
    fetchSummary();
    fetchNotices();
    fetchMembers();
  }, []);

  const formatCur = (num) => `₹${Math.round(Number(num || 0)).toLocaleString('en-IN')}`;



  const getTranslatedNotice = (n) => {
    if (language !== 'ta') return n;
    let title = n.title || '';
    let message = n.message || '';
    if (title.includes('Monthly SHG Meeting') || title.includes('Monthly Meeting')) {
      title = 'மாதாந்திர சுயஉதவிக் குழு கூட்ட அறிவிப்பு';
    } else if (title.includes('Emergency Loan')) {
      title = 'அவசர கடன் வழிகாட்டுதல்கள்';
    } else if (title.includes('Savings Deposit')) {
      title = 'சேமிப்பு வைப்பு அறிவிப்பு';
    }

    message = message.replace(/Please attend our monthly meeting/gi, 'தயவுசெய்து நமது மாதாந்திர சுயஉதவிக் குழு கூட்டத்தில் கலந்துகொள்ளவும்');
    message = message.replace(/to collect savings and review loans\./gi, 'சேமிப்புத் தொகையைச் சேகரிக்க மற்றும் கடன்களை ஆய்விட.');
    message = message.replace(/Loan requests require leader approval/gi, 'கடன் கோரிக்கைகளுக்கு குழுத் தலைவியின் ஒப்புதல் தேவை');
    message = message.replace(/Ensure monthly savings deposits are made on time\./gi, 'மாதாந்திர சேமிப்பு வைப்புகளை சரியான நேரத்தில் செலுத்துவதை உறுதிசெய்யவும்.');

    return { ...n, title, message };
  };

  return (
    <div className="container-fluid p-0 animate-fade-in">
      {/* Welcome header */}
      <div className="mb-4 pb-1">
        <h2 className="fw-extrabold text-brown m-0" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {t.welcomeUser || 'Welcome'}, {user?.full_name || 'Hema'}
        </h2>
        <p className="text-muted small m-0">{t.leaderDashboardSubtitle || 'Manage your group savings, loans, and member requests.'}</p>
      </div>



      {/* KPI Stats Cards */}
      <div className="row g-3 mb-4">
        {/* Card 1: Total Group Savings */}
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card-glass d-flex align-items-center gap-3 p-3.5 shadow-sm border border-light h-100" style={{ minHeight: '90px' }}>
            <div className="p-3 bg-light rounded-circle text-brown flex-shrink-0" style={{ border: '1px solid var(--warm-border)' }}>
              <PiggyBank size={24} />
            </div>
            <div className="overflow-hidden">
              <div className="text-muted small fw-bold uppercase tracking-wider text-truncate" style={{ fontSize: '11px' }}>{t.savings || 'Total Group Savings'}</div>
              <h3 className="m-0 fw-extrabold text-success text-truncate" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px' }}>
                {formatCur(summary.totalGroupSavings)}
              </h3>
            </div>
          </div>
        </div>

        {/* Card 2: Total Active Loan Disbursed */}
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card-glass d-flex align-items-center gap-3 p-3.5 shadow-sm border border-light h-100" style={{ minHeight: '90px' }}>
            <div className="p-3 bg-light rounded-circle text-brown flex-shrink-0" style={{ border: '1px solid var(--warm-border)' }}>
              <HandCoins size={24} />
            </div>
            <div className="overflow-hidden">
              <div className="text-muted small fw-bold uppercase tracking-wider text-truncate" style={{ fontSize: '11px' }}>{t.totalLoanAmount || 'Total Loan Amount'}</div>
              <h3 className="m-0 fw-extrabold text-brown text-truncate" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px' }}>
                {formatCur(summary.totalActiveDisbursed)}
              </h3>
            </div>
          </div>
        </div>

        {/* Card 3: Total Outstanding Loans */}
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card-glass d-flex align-items-center gap-3 p-3.5 shadow-sm border border-light h-100" style={{ minHeight: '90px' }}>
            <div className="p-3 bg-light rounded-circle text-brown flex-shrink-0" style={{ border: '1px solid var(--warm-border)' }}>
              <HandCoins size={24} />
            </div>
            <div className="overflow-hidden">
              <div className="text-muted small fw-bold uppercase tracking-wider text-truncate" style={{ fontSize: '11px' }}>{t.remainingLoan || 'Total Remaining Loan'}</div>
              <h3 className="m-0 fw-extrabold text-danger text-truncate" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px' }}>
                {formatCur(summary.totalOutstandingLoans)}
              </h3>
            </div>
          </div>
        </div>

        {/* Card 4: Total Pending Loan Requests */}
        <div className="col-12 col-sm-6 col-md-3">
          <div className="card-glass d-flex align-items-center gap-3 p-3.5 shadow-sm border border-light h-100" style={{ minHeight: '90px' }}>
            <div className="p-3 bg-light rounded-circle text-brown flex-shrink-0" style={{ border: '1px solid var(--warm-border)' }}>
              <CheckSquare size={24} />
            </div>
            <div className="overflow-hidden">
              <div className="text-muted small fw-bold uppercase tracking-wider text-truncate" style={{ fontSize: '11px' }}>{t.totalLoanRequests || 'Total Loan Requests'}</div>
              <h3 className="m-0 fw-extrabold text-warning text-truncate" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px' }}>
                {summary.pendingApprovalsCount || 0}
              </h3>
            </div>
          </div>
        </div>
      </div>



      <div className="row g-4">
        {/* Quick Actions Grid */}
        <div className="col-12 col-lg-6">
          <div className="card-glass h-100 p-4">
            <h4 className="mb-3 fw-extrabold text-brown" style={{ fontSize: '16px', fontFamily: "'Outfit', sans-serif" }}>
              {t.quickActions}
            </h4>
            
            <div className="row g-3">
              <div className="col-6">
                <button 
                  onClick={() => navigate('/leader/add-entry')} 
                  className="btn btn-outline-brown w-100 py-3 d-flex flex-column align-items-center gap-2 h-100 justify-content-center border-2"
                  style={{ borderRadius: '16px', padding: '20px 10px' }}
                >
                  <PlusCircle size={24} />
                  <strong style={{ fontSize: '13px' }}>{t.addEntry}</strong>
                </button>
              </div>

              <div className="col-6">
                <button 
                  onClick={() => navigate('/leader/loans')} 
                  className="btn btn-outline-brown w-100 py-3 d-flex flex-column align-items-center gap-2 h-100 justify-content-center border-2"
                  style={{ borderRadius: '16px', padding: '20px 10px' }}
                >
                  <CheckSquare size={24} />
                  <strong style={{ fontSize: '13px' }}>{t.reviewLoans}</strong>
                </button>
              </div>

              <div className="col-6">
                <button 
                  onClick={() => navigate('/leader/post-notice')} 
                  className="btn btn-outline-brown w-100 py-3 d-flex flex-column align-items-center gap-2 h-100 justify-content-center border-2"
                  style={{ borderRadius: '16px', padding: '20px 10px' }}
                >
                  <Megaphone size={24} />
                  <strong style={{ fontSize: '13px' }}>{t.createNotice || 'Post Notice'}</strong>
                </button>
              </div>

              <div className="col-6">
                <button 
                  onClick={() => navigate('/members')} 
                  className="btn btn-outline-brown w-100 py-3 d-flex flex-column align-items-center gap-2 h-100 justify-content-center border-2"
                  style={{ borderRadius: '16px', padding: '20px 10px' }}
                >
                  <Users size={24} />
                  <strong style={{ fontSize: '13px' }}>{t.memberDirectory}</strong>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notices list */}
        <div className="col-12 col-lg-6">
          <div className="card-glass h-100 p-4 d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="m-0 fw-extrabold text-brown" style={{ fontSize: '16px', fontFamily: "'Outfit', sans-serif" }}>
                {t.noticeBoard}
              </h4>
              <Link to="/leader/post-notice" className="text-decoration-none small fw-bold d-flex align-items-center gap-0.5" style={{ color: 'var(--primary-brown)' }}>
                <span>+ {t.createNotice || 'Post Notice'}</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            <div className="flex-grow-1 overflow-auto" style={{ maxHeight: '250px' }}>
              {notices.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <Megaphone size={30} className="mb-2 opacity-50 text-brown" />
                  <div className="small fw-semibold">{t.noAnnouncements || 'No announcements posted yet.'}</div>
                </div>
              ) : (
                <div className="d-flex flex-column gap-2.5">
                  {notices.map((rawNotice) => {
                    const n = getTranslatedNotice(rawNotice);
                    return (
                      <div key={n.id} className="p-3 rounded-3 bg-light border border-light shadow-sm">
                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <strong className="text-dark" style={{ fontSize: '13px' }}>{n.title}</strong>
                          <span className="text-muted" style={{ fontSize: '9px' }}>
                            {new Date(n.created_at).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        <p className="text-muted small m-0" style={{ fontSize: '11px', lineHeight: '1.4' }}>{n.message}</p>
                        {n.meeting_datetime && (
                          <div className="mt-2 p-1.5 px-2 rounded bg-white text-brown font-weight-bold d-flex align-items-center gap-1.5 border border-light" style={{ fontSize: '10px', color: 'var(--primary-brown)' }}>
                            <Calendar size={12} className="text-warning" />
                            <span>{t.meeting || 'Meeting'}: {new Date(n.meeting_datetime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── UPI Payment Verification Section ── */}
      <div className="mt-4">
        <PaymentVerificationPanel />
      </div>
    </div>
  );
};

export default LeaderDashboard;
