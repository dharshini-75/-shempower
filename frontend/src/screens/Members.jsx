import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import { Users, ChevronRight, FileText, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { downloadStatement, downloadPDFStatement } from '../utils/downloadHelper';

/* ── Avatar initials ── */
const getInitials = (name = '') =>
  name.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');

/* ── Plain number for UI display ── */
const fmt = (num) => Math.round(Number(num || 0)).toLocaleString('en-IN');

/* ── Pill button style (same fixed width for PDF & CSV) ── */
const pill = (filled, busy) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '5px',
  width: '76px',
  height: '32px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: '600',
  fontFamily: "'Outfit', sans-serif",
  cursor: busy ? 'not-allowed' : 'pointer',
  opacity: busy ? 0.55 : 1,
  transition: 'opacity .2s',
  border: '1.5px solid #8B5E3C',
  background: filled ? '#8B5E3C' : 'transparent',
  color: filled ? '#fff' : '#8B5E3C',
  boxShadow: filled ? '0 2px 6px rgba(139,94,60,0.22)' : 'none',
  flexShrink: 0,
});

const Members = () => {
  const navigate = useNavigate();
  const { members, fetchMembers } = useFinancial();
  const { user, t } = useAuth();
  const [alertState, setAlertState] = useState({ show: false, message: '', isError: false });
  const [loadingKey, setLoadingKey] = useState('');

  const isLeader = user?.role?.toLowerCase() === 'leader';
  const leaderName = user?.full_name || '';

  useEffect(() => { fetchMembers(); }, []);

  const handleRowClick = (memberId) => {
    if (isLeader || Number(user?.id) === Number(memberId)) {
      navigate(isLeader ? `/leader/member/${memberId}` : `/member/${memberId}`);
    }
  };

  const showAlert = (message, isError = false) => {
    setAlertState({ show: true, message, isError });
    setTimeout(() => setAlertState({ show: false, message: '', isError: false }), 4000);
  };

  /* ══════════════ GROUP DOWNLOAD HANDLERS ══════════════ */

  const handleGroupSavingsPDF = async () => {
    if (!members?.length) return;
    setLoadingKey('gSavPdf');
    const rows = members.map(m => [
      m.full_name,
      Math.round(Number(m.lifetime_savings || 0)),
      m.mobile_number
    ]);
    try {
      const res = await downloadPDFStatement({
        filename: 'SHEmpower_Group_Savings.pdf',
        title: `GROUP SAVINGS REPORT`,
        type: 'savings',
        headers: ['Member Name', 'Total Savings', 'Mobile'],
        rows,
        memberName: leaderName ? `Group Leader: ${leaderName}` : '',
      });
      if (res?.success) showAlert('Group Savings PDF downloaded successfully.');
    } catch { showAlert('Unable to download PDF.', true); }
    finally { setLoadingKey(''); }
  };

  const handleGroupSavingsCSV = async () => {
    if (!members?.length) return;
    setLoadingKey('gSavCsv');
    // First row carries the leader name as a metadata row
    const headers = ['Group Leader', 'Member Name', 'Member ID', 'Mobile', 'Total Savings'];
    const rows = members.map(m => [
      leaderName,
      m.full_name,
      m.id,
      m.mobile_number,
      Math.round(Number(m.lifetime_savings || 0))
    ]);
    try {
      const res = await downloadStatement({ filename: 'SHEmpower_Group_Savings.csv', headers, rows });
      if (res?.success) showAlert('Group Savings CSV downloaded successfully.');
    } catch { showAlert('Unable to download CSV.', true); }
    finally { setLoadingKey(''); }
  };

  const handleGroupLoanPDF = async () => {
    if (!members?.length) return;
    setLoadingKey('gLoanPdf');
    const rows = members.map(m => [
      m.full_name,
      Math.round(Number(m.total_loan_amount || 0)),
      Math.round(Number(m.amount_paid || 0)),
      Math.round(Number(m.interest_paid || 0)),
      Math.round(Number(m.outstanding_loan || 0))
    ]);
    try {
      const res = await downloadPDFStatement({
        filename: 'SHEmpower_Group_Loans.pdf',
        title: `GROUP LOAN REPORT`,
        type: 'loans',
        headers: ['Member Name', 'Loan Amount', 'Amount Paid', 'Interest', 'Remaining'],
        rows,
        memberName: leaderName ? `Group Leader: ${leaderName}` : '',
      });
      if (res?.success) showAlert('Group Loans PDF downloaded successfully.');
    } catch { showAlert('Unable to download PDF.', true); }
    finally { setLoadingKey(''); }
  };

  const handleGroupLoanCSV = async () => {
    if (!members?.length) return;
    setLoadingKey('gLoanCsv');
    const headers = ['Group Leader', 'Member Name', 'Member ID', 'Loan Amount', 'Amount Paid', 'Interest Paid', 'Remaining', 'Status'];
    const rows = members.map(m => [
      leaderName,
      m.full_name,
      m.id,
      Math.round(Number(m.total_loan_amount || 0)),
      Math.round(Number(m.amount_paid || 0)),
      Math.round(Number(m.interest_paid || 0)),
      Math.round(Number(m.outstanding_loan || 0)),
      m.status_tag || 'Clear'
    ]);
    try {
      const res = await downloadStatement({ filename: 'SHEmpower_Group_Loans.csv', headers, rows });
      if (res?.success) showAlert('Group Loans CSV downloaded successfully.');
    } catch { showAlert('Unable to download CSV.', true); }
    finally { setLoadingKey(''); }
  };

  /* ══════════════ RENDER ══════════════ */
  return (
    <div className="container-fluid p-0 safe-wrapper animate-fade-in" style={{ paddingBottom: '100px' }}>

      {/* ── Page Header ── */}
      <div className="mb-4">
        <h2 className="fw-extrabold text-brown m-0" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {t.memberDirectory || 'Member Roster'}
        </h2>
        {isLeader && leaderName && (
          <div className="mt-1 d-flex align-items-center gap-1">
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#8B5E3C' }}>Group Leader:</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#5C3317' }}>{leaderName}</span>
          </div>
        )}
        <p className="text-muted small m-0 mt-1">
          {isLeader
            ? 'Directory of registered SHG members. Tap any member to view details.'
            : 'Tap yourself ("Me") to view your passbooks.'}
        </p>
      </div>

      {/* ── Toast Alert ── */}
      {alertState.show && (
        <div
          className="d-flex align-items-center gap-2 px-4 py-3 rounded-4 mb-3 shadow-sm"
          style={{
            background: alertState.isError ? '#FFF5F5' : '#FBF6F0',
            border: `1.5px solid ${alertState.isError ? '#F5C6C6' : '#DEC9B4'}`,
            color: alertState.isError ? '#8B0000' : '#5C3317',
          }}
        >
          {alertState.isError
            ? <AlertCircle size={17} className="flex-shrink-0" />
            : <CheckCircle2 size={17} className="flex-shrink-0" />}
          <span className="fw-semibold" style={{ fontSize: '13px' }}>{alertState.message}</span>
          <button
            type="button"
            className="btn-close ms-auto shadow-none"
            style={{ fontSize: '10px' }}
            onClick={() => setAlertState({ show: false, message: '', isError: false })}
          />
        </div>
      )}

      {/* ── LEADER ONLY: Group Financial Downloads ── */}
      {isLeader && members.length > 0 && (
        <div
          className="mb-4 rounded-4 p-4"
          style={{ background: '#FBF6F0', border: '1.5px solid #E8D5C0' }}
        >
          {/* Section heading */}
          <div className="d-flex align-items-center gap-2 mb-1">
            <Download size={14} style={{ color: '#8B5E3C' }} />
            <span className="fw-bold text-brown" style={{ fontSize: '14px', fontFamily: "'Outfit', sans-serif" }}>
              Group Financial Downloads
            </span>
          </div>
          <p className="text-muted mb-3" style={{ fontSize: '11.5px' }}>
            Download complete savings and loan records for all members.
          </p>

          {/* Savings row */}
          <div
            className="d-flex align-items-center justify-content-between rounded-3 px-3 py-2 mb-2"
            style={{ background: '#fff', border: '1px solid #EDE0D5' }}
          >
            <span className="fw-semibold text-brown" style={{ fontSize: '13px' }}>Savings</span>
            <div className="d-flex gap-2">
              <button onClick={handleGroupSavingsPDF} disabled={!!loadingKey} style={pill(true, !!loadingKey)}>
                <FileText size={12} />
                {loadingKey === 'gSavPdf' ? '…' : 'PDF'}
              </button>
              <button onClick={handleGroupSavingsCSV} disabled={!!loadingKey} style={pill(false, !!loadingKey)}>
                <FileSpreadsheet size={12} />
                {loadingKey === 'gSavCsv' ? '…' : 'CSV'}
              </button>
            </div>
          </div>

          {/* Loans row */}
          <div
            className="d-flex align-items-center justify-content-between rounded-3 px-3 py-2"
            style={{ background: '#fff', border: '1px solid #EDE0D5' }}
          >
            <span className="fw-semibold text-brown" style={{ fontSize: '13px' }}>Loans</span>
            <div className="d-flex gap-2">
              <button onClick={handleGroupLoanPDF} disabled={!!loadingKey} style={pill(true, !!loadingKey)}>
                <FileText size={12} />
                {loadingKey === 'gLoanPdf' ? '…' : 'PDF'}
              </button>
              <button onClick={handleGroupLoanCSV} disabled={!!loadingKey} style={pill(false, !!loadingKey)}>
                <FileSpreadsheet size={12} />
                {loadingKey === 'gLoanCsv' ? '…' : 'CSV'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Member List ── */}
      {members.length === 0 ? (
        <div
          className="text-center py-5 px-4 rounded-4"
          style={{ background: '#fff', border: '1.5px solid #E8D5C0' }}
        >
          <div
            className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
            style={{ width: 52, height: 52, background: '#F5EFE9' }}
          >
            <Users size={24} style={{ color: '#8B5E3C' }} />
          </div>
          <div className="fw-semibold text-muted" style={{ fontSize: '14px' }}>No members found</div>
        </div>
      ) : (
        <>
          {/* ── Desktop Table (md+) ── */}
          <div
            className="d-none d-md-block rounded-4 overflow-hidden"
            style={{ border: '1.5px solid #E8D5C0', background: '#fff' }}
          >
            <table className="table table-warm text-start align-middle mb-0" style={{ fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#FAF4EE', borderBottom: '2px solid #E8D5C0' }}>
                  {['Member', 'Mobile', 'Savings', 'Loan', 'Paid', 'Interest', 'Remaining', 'Status'].map((h, i) => (
                    <th
                      key={h}
                      className={i >= 2 && i <= 6 ? 'text-end' : i === 7 ? 'text-center' : ''}
                      style={{ fontWeight: 700, color: '#8B5E3C', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '12px 14px' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((member, idx) => {
                  const isClickable = isLeader || Number(user?.id) === Number(member.id);
                  const isMe = Number(user?.id) === Number(member.id);
                  const isClear = member.status_tag === 'Clear';
                  return (
                    <tr
                      key={member.id}
                      onClick={() => handleRowClick(member.id)}
                      style={{
                        cursor: isClickable ? 'pointer' : 'default',
                        background: isMe ? '#FFFBF5' : idx % 2 === 0 ? '#fff' : '#FDFAF7',
                        borderBottom: '1px solid #F0E4D6',
                      }}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                            style={{ width: 30, height: 30, background: '#EDD9C4', color: '#7A4A2A', fontSize: '10px' }}
                          >
                            {getInitials(member.full_name)}
                          </div>
                          <div>
                            <div className="fw-bold" style={{ fontSize: '13px', color: '#2D1A0E' }}>{member.full_name}</div>
                            {isMe && (
                              <span style={{ fontSize: '8.5px', fontWeight: 700, padding: '1px 6px', borderRadius: '20px', background: '#8B5E3C', color: '#fff' }}>
                                YOU
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#6B5C52', fontSize: '12px', padding: '12px 14px' }}>{member.mobile_number}</td>
                      <td className="text-end fw-bold" style={{ color: '#4A3728', padding: '12px 14px' }}>{fmt(member.lifetime_savings)}</td>
                      <td className="text-end fw-bold" style={{ color: '#4A3728', padding: '12px 14px' }}>{fmt(member.total_loan_amount)}</td>
                      <td className="text-end fw-bold" style={{ color: '#4A3728', padding: '12px 14px' }}>{fmt(member.amount_paid)}</td>
                      <td className="text-end fw-bold" style={{ color: '#4A3728', padding: '12px 14px' }}>{fmt(member.interest_paid)}</td>
                      <td className="text-end fw-bold" style={{ color: '#4A3728', padding: '12px 14px' }}>{fmt(member.outstanding_loan)}</td>
                      <td className="text-center" style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                            background: isClear ? '#EDD9C4' : '#F5EFE9',
                            color: isClear ? '#5C3317' : '#8B5E3C',
                            border: '1px solid #DEC9B4',
                          }}
                        >
                          {isClear ? (t.clearStatus || 'Clear') : (t.dueStatus || 'Due')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Cards (< md) ── */}
          <div className="d-md-none d-flex flex-column gap-3">
            {members.map((member) => {
              const isClickable = isLeader || Number(user?.id) === Number(member.id);
              const isMe = Number(user?.id) === Number(member.id);
              const isClear = member.status_tag === 'Clear';

              return (
                <div
                  key={member.id}
                  onClick={() => handleRowClick(member.id)}
                  style={{
                    background: isMe ? '#FFFBF5' : '#fff',
                    borderRadius: '14px',
                    border: '1.5px solid #E8D5C0',
                    boxShadow: '0 2px 8px rgba(139,94,60,0.07)',
                    overflow: 'hidden',
                    cursor: isClickable ? 'pointer' : 'default',
                  }}
                >
                  {/* Card header: avatar + name + phone + status + chevron */}
                  <div
                    className="d-flex align-items-center gap-3 px-4 py-3"
                    style={{ borderBottom: '1px solid #F0E8DF' }}
                  >
                    {/* Avatar */}
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                      style={{ width: 40, height: 40, background: '#EDD9C4', color: '#7A4A2A', fontSize: '13px' }}
                    >
                      {getInitials(member.full_name)}
                    </div>

                    {/* Name + phone */}
                    <div className="flex-grow-1 overflow-hidden">
                      <div className="d-flex align-items-center gap-1 flex-wrap">
                        <strong style={{ fontSize: '14px', color: '#2D1A0E' }}>{member.full_name}</strong>
                        {isMe && (
                          <span style={{ fontSize: '8px', fontWeight: 700, padding: '1px 7px', borderRadius: '20px', background: '#8B5E3C', color: '#fff' }}>
                            YOU
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#8B7868', marginTop: '1px' }}>{member.mobile_number}</div>
                    </div>

                    {/* Status + chevron */}
                    <div className="d-flex align-items-center gap-1 flex-shrink-0">
                      <span
                        style={{
                          fontSize: '10.5px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                          background: isClear ? '#EDD9C4' : '#FFF0E8',
                          color: isClear ? '#5C3317' : '#8B3E0F',
                          border: `1px solid ${isClear ? '#DEC9B4' : '#F5CDB0'}`,
                        }}
                      >
                        {isClear ? (t.clearStatus || 'Clear') : (t.dueStatus || 'Due')}
                      </span>
                      {isClickable && <ChevronRight size={15} style={{ color: '#C4A882' }} />}
                    </div>
                  </div>

                  {/* Stats — clean vertical list */}
                  <div style={{ padding: '12px 16px' }}>
                    {[
                      { label: 'Total Savings', value: fmt(member.lifetime_savings) },
                      { label: 'Total Loan', value: fmt(member.total_loan_amount) },
                      { label: 'Amount Paid', value: fmt(member.amount_paid) },
                      { label: 'Remaining Loan', value: fmt(member.outstanding_loan) },
                    ].map(({ label, value }, i, arr) => (
                      <div
                        key={label}
                        className="d-flex justify-content-between align-items-center"
                        style={{
                          padding: '6px 0',
                          borderBottom: i < arr.length - 1 ? '1px solid #F0E8DF' : 'none',
                        }}
                      >
                        <span style={{ fontSize: '12px', color: '#8B7868', fontWeight: 500 }}>{label}</span>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#4A3728' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Footer count */}
      {members.length > 0 && (
        <div className="text-center mt-3" style={{ fontSize: '12px', color: '#B09070' }}>
          {members.length} member{members.length !== 1 ? 's' : ''} in this group
        </div>
      )}
    </div>
  );
};

export default Members;
