import React, { useEffect, useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import { Check, X, ShieldAlert, ShieldCheck, HelpCircle, Calendar, Clock } from 'lucide-react';

const Loans = () => {
  const { loanQueue, fetchLoanQueue, reviewLoan } = useFinancial();
  const { t } = useAuth();
  const [actionLoading, setActionLoading] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchLoanQueue();
  }, []);

  const handleAction = async (loanId, action) => {
    setErrorMsg('');
    setSuccessMsg('');
    setActionLoading(loanId);
    
    const res = await reviewLoan(loanId, action);
    setActionLoading(null);

    if (res.success) {
      setSuccessMsg(`Loan request successfully ${action === 'approve' ? 'approved' : 'rejected'}!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setErrorMsg(res.message || 'Failed to complete review action');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const getStatusBadgeClass = (status) => {
    if (status === 'approved') return 'badge bg-light text-success border border-success fw-bold';
    if (status === 'rejected') return 'badge bg-light text-danger border border-danger fw-bold';
    return 'badge bg-light text-warning border border-warning fw-bold';
  };

  const formatCur = (num) => `₹${Math.round(Number(num || 0)).toLocaleString('en-IN')}`;

  return (
    <div className="container-fluid p-0 animate-fade-in">
      <div className="mb-4 pb-1">
        <h2 className="fw-extrabold text-brown m-0" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {t.reviewLoans}
        </h2>
        <p className="text-muted small m-0">Approve or reject member emergency loan requests</p>
      </div>

      {successMsg && (
        <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 border-0 small text-success mb-3 animate-scale-up" style={{ backgroundColor: 'var(--success-olive-light)', borderRadius: '10px' }}>
          <ShieldCheck size={16} className="flex-shrink-0 text-success" />
          <span className="fw-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 border-0 small mb-3 animate-scale-up" style={{ backgroundColor: 'var(--terracotta-danger-light)', color: 'var(--terracotta-danger)', borderRadius: '10px' }}>
          <ShieldAlert size={16} className="flex-shrink-0" />
          <span className="fw-semibold">{errorMsg}</span>
        </div>
      )}

      <div className="card-glass p-4">
        {loanQueue.length === 0 ? (
          <div className="text-center text-muted py-5">
            <HelpCircle size={36} className="mb-2 opacity-50 text-brown" />
            <div>No loan requests in queue.</div>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="table-responsive d-none d-md-block">
              <table className="table table-warm text-start" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>Member Name</th>
                    <th>Amount</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Tenure</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loanQueue.map((loan) => (
                    <tr key={loan.id}>
                      <td><strong>{loan.member_name}</strong></td>
                      <td className="fw-bold text-brown">{formatCur(loan.amount_requested)}</td>
                      <td>{loan.reason_category}</td>
                      <td><span className="small text-muted">{loan.description || 'N/A'}</span></td>
                      <td>{loan.tenure_months} Months</td>
                      <td style={{ fontSize: '12px' }}>
                        {new Date(loan.requested_date).toLocaleDateString('en-IN')}
                      </td>
                      <td>
                        <span className={getStatusBadgeClass(loan.status)} style={{ textTransform: 'capitalize' }}>
                          {loan.status}
                        </span>
                      </td>
                      <td>
                        {loan.status === 'pending' ? (
                          <div className="d-flex gap-2">
                            <button
                              onClick={() => handleAction(loan.id, 'approve')}
                              disabled={actionLoading !== null}
                              className="btn btn-sm btn-brown d-flex align-items-center gap-1 py-1.5 px-2.5"
                              style={{ fontSize: '11px', borderRadius: '6px' }}
                            >
                              <Check size={12} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleAction(loan.id, 'reject')}
                              disabled={actionLoading !== null}
                              className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1 py-1.5 px-2.5"
                              style={{ fontSize: '11px', borderRadius: '6px', border: '1px solid var(--terracotta-danger)', color: 'var(--terracotta-danger)', backgroundColor: 'transparent' }}
                            >
                              <X size={12} />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted small">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards Feed */}
            <div className="mobile-feed d-md-none">
              {loanQueue.map((loan) => (
                <div key={loan.id} className="mobile-feed-item shadow-sm p-3.5">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <strong className="text-dark fs-6">{loan.member_name}</strong>
                      <div className="text-muted d-flex align-items-center gap-1 mt-0.5" style={{ fontSize: '10px' }}>
                        <Calendar size={10} />
                        <span>Requested: {new Date(loan.requested_date).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                    <span className={getStatusBadgeClass(loan.status)} style={{ textTransform: 'capitalize', fontSize: '10px' }}>
                      {loan.status}
                    </span>
                  </div>

                  <div className="row g-2 border-top border-light pt-2 mt-1.5 text-center text-md-start" style={{ fontSize: '11.5px' }}>
                    <div className="col-4 border-end border-light">
                      <span className="text-muted d-block" style={{ fontSize: '9px' }}>Requested</span>
                      <strong className="text-brown">{formatCur(loan.amount_requested)}</strong>
                    </div>
                    <div className="col-4 border-end border-light">
                      <span className="text-muted d-block" style={{ fontSize: '9px' }}>Category</span>
                      <strong className="text-dark">{loan.reason_category}</strong>
                    </div>
                    <div className="col-4">
                      <span className="text-muted d-block" style={{ fontSize: '9px' }}>Tenure</span>
                      <strong className="text-dark">{loan.tenure_months} Months</strong>
                    </div>
                  </div>

                  {loan.description && (
                    <p className="text-muted small m-0 mt-2 p-2 rounded bg-light border border-light" style={{ fontSize: '11px', lineHeight: '1.4' }}>
                      {loan.description}
                    </p>
                  )}

                  {loan.status === 'pending' && (
                    <div className="row g-2.5 mt-3 pt-2 border-top border-light">
                      <div className="col-6">
                        <button
                          onClick={() => handleAction(loan.id, 'approve')}
                          disabled={actionLoading !== null}
                          className="btn btn-brown w-100 py-2.5 d-flex align-items-center justify-content-center gap-1.5 shadow-sm"
                          style={{ borderRadius: '12px', fontSize: '12.5px' }}
                        >
                          <Check size={16} />
                          <span>Approve</span>
                        </button>
                      </div>
                      <div className="col-6">
                        <button
                          onClick={() => handleAction(loan.id, 'reject')}
                          disabled={actionLoading !== null}
                          className="btn btn-outline-danger w-100 py-2.5 d-flex align-items-center justify-content-center gap-1.5 shadow-sm"
                          style={{ borderRadius: '12px', fontSize: '12.5px', border: '1px solid var(--terracotta-danger)', color: 'var(--terracotta-danger)' }}
                        >
                          <X size={16} />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Loans;
