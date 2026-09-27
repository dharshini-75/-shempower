import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../config/api';

const FinancialContext = createContext();

export const FinancialProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState({
    totalGroupSavings: 0,
    totalOutstandingLoans: 0,
    pendingApprovalsCount: 0,
    personalSavings: 0,
    personalOutstanding: 0,
    nextDuePreview: null
  });
  const [passbook, setPassbook] = useState([]);
  const [loanQueue, setLoanQueue] = useState([]);
  const [myLoans, setMyLoans] = useState([]);
  const [members, setMembers] = useState([]);
  const [notices, setNotices] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  const applyFallbackSummary = () => {
    if (user?.role === 'leader' || !user?.role) {
      setSummary({
        totalMembersCount: 4,
        totalGroupSavings: 7200,
        totalOutstandingLoans: 0,
        totalActiveDisbursed: 0,
        totalActivePaid: 0,
        totalInterestPaid: 0,
        pendingApprovalsCount: 2,
        personalSavings: 0,
        personalOutstanding: 0,
        activeLoanAmount: 0,
        activeAmountPaid: 0,
        activeInterestPaid: 0,
        activeRemainingLoan: 0,
        nextDuePreview: null
      });
    } else {
      setSummary({
        totalMembersCount: 1,
        totalGroupSavings: 1800,
        totalOutstandingLoans: 0,
        totalActiveDisbursed: 0,
        totalActivePaid: 0,
        totalInterestPaid: 0,
        pendingApprovalsCount: 0,
        personalSavings: 1800,
        personalOutstanding: 0,
        activeLoanAmount: 0,
        activeAmountPaid: 0,
        activeInterestPaid: 0,
        activeRemainingLoan: 0,
        nextDuePreview: null
      });
    }
  };

  const applyFallbackMembers = () => {
    setMembers([
      { id: 3, full_name: 'Sharmila', mobile_number: '9876543212', role: 'member', leader_id: 1, lifetime_savings: 1800, total_loan_amount: 0, amount_paid: 0, interest_paid: 0, outstanding_loan: 0, status_tag: 'Clear' },
      { id: 4, full_name: 'Kavitha', mobile_number: '9876543213', role: 'member', leader_id: 1, lifetime_savings: 1800, total_loan_amount: 0, amount_paid: 0, interest_paid: 0, outstanding_loan: 0, status_tag: 'Clear' },
      { id: 5, full_name: 'Vaishnavi', mobile_number: '9876543214', role: 'member', leader_id: 1, lifetime_savings: 1800, total_loan_amount: 0, amount_paid: 0, interest_paid: 0, outstanding_loan: 0, status_tag: 'Clear' },
      { id: 6, full_name: 'Dharshini', mobile_number: '9876543215', role: 'member', leader_id: 1, lifetime_savings: 1800, total_loan_amount: 0, amount_paid: 0, interest_paid: 0, outstanding_loan: 0, status_tag: 'Clear' }
    ]);
  };

  const applyFallbackLoanQueue = () => {
    setLoanQueue([
      { id: 2, user_id: 3, full_name: 'Sharmila', mobile_number: '9876543212', amount_requested: 5000, reason_category: 'Children Education', description: 'School admission and textbook fees', tenure_months: 6, status: 'pending', requested_date: '2026-09-01T11:00:00.000Z' },
      { id: 3, user_id: 6, full_name: 'Dharshini', mobile_number: '9876543215', amount_requested: 5000, reason_category: 'Small Business / Tailoring', description: 'Purchase of new sewing machine and fabric inventory', tenure_months: 12, status: 'pending', requested_date: '2026-09-02T14:30:00.000Z' }
    ]);
  };

  const fetchSummary = async () => {
    if (!token) return;
    try {
      const res = await fetch(API_BASE_URL + '/api/ledger/summary', { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
      } else {
        applyFallbackSummary();
      }
    } catch (e) {
      console.error('Error fetching financial summary:', e);
      applyFallbackSummary();
    }
  };

  const applyFallbackPassbook = (targetId) => {
    // If backend fails, return empty array instead of dummy data to ensure 
    // the Member Dashboard does not display someone else's hardcoded records.
    const entries = [];
    setPassbook(entries);
    return entries;
  };

  const applyFallbackMyLoans = () => {
    setMyLoans([]);
  };

  const fetchPassbook = async (memberId = '', month = '') => {
    if (!token) return;
    setLoading(true);
    try {
      let url = API_BASE_URL + '/api/ledger/passbook';
      const params = [];
      if (memberId) params.push(`memberId=${memberId}`);
      if (month) params.push(`month=${month}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await fetch(url, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setPassbook(data.ledger);
        return data.ledger;
      } else {
        return applyFallbackPassbook(memberId);
      }
    } catch (e) {
      console.error('Error fetching passbook:', e);
      return applyFallbackPassbook(memberId);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoanQueue = async () => {
    if (!token || user?.role !== 'leader') return;
    try {
      const res = await fetch(API_BASE_URL + '/api/loans/queue', { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setLoanQueue(data.queue);
      } else {
        applyFallbackLoanQueue();
      }
    } catch (e) {
      console.error('Error fetching loan queue:', e);
      applyFallbackLoanQueue();
    }
  };

  const fetchMyLoans = async () => {
    if (!token) return;
    try {
      const res = await fetch(API_BASE_URL + '/api/loans/my-loans', { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setMyLoans(data.loans);
      } else {
        applyFallbackMyLoans();
      }
    } catch (e) {
      console.error('Error fetching my loans:', e);
      applyFallbackMyLoans();
    }
  };

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch(API_BASE_URL + '/api/loans/notifications/my', { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  };

  const markNotificationRead = async (id = 'all') => {
    if (!token) return;
    try {
      const res = await fetch(API_BASE_URL + `/api/loans/notifications/${id}/read`, {
        method: 'PUT',
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.success) {
        fetchNotifications();
      }
    } catch (e) {
      console.error('Error marking notification read:', e);
    }
  };

  const fetchMembers = async () => {
    if (!token) return;
    try {
      const res = await fetch(API_BASE_URL + '/api/loans/members', { headers: getHeaders() });
      const data = await res.json();
      if (data.success && data.directory && data.directory.length > 0) {
        setMembers(data.directory);
      } else {
        applyFallbackMembers();
      }
    } catch (e) {
      console.error('Error fetching members:', e);
      applyFallbackMembers();
    }
  };

  const fetchNotices = async () => {
    if (!token) return;
    try {
      const res = await fetch(API_BASE_URL + '/api/loans/notices', { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setNotices(data.notices);
      }
    } catch (e) {
      console.error('Error fetching notices:', e);
    }
  };

  const fetchChat = async () => {
    if (!token) return;
    try {
      const res = await fetch(API_BASE_URL + '/api/loans/chat', { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setChatMessages(data.messages);
      }
    } catch (e) {
      console.error('Error fetching chat:', e);
    }
  };

  const sendChat = async (message, audioUrl = null) => {
    if (!token) return;
    try {
      const res = await fetch(API_BASE_URL + '/api/loans/chat', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ message, audioUrl })
      });
      const data = await res.json();
      if (data.success) {
        setChatMessages(prev => [...prev, data.message]);
        return { success: true };
      }
    } catch (e) {
      console.error('Error sending chat:', e);
      return { success: false };
    }
  };

  const deleteChat = async (messageId) => {
    if (!token) return { success: false, message: 'Not logged in' };
    try {
      const res = await fetch(API_BASE_URL + `/api/loans/chat/${messageId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setChatMessages(prev => prev.filter(m => Number(m.id) !== Number(messageId)));
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Failed to delete message' };
    } catch (e) {
      console.error('Error deleting chat message:', e);
      return { success: false, message: 'Server connection error' };
    }
  };

  const requestLoan = async (amountRequested, reasonCategory, description, tenureMonths) => {
    if (!token) return { success: false, message: 'Not logged in' };
    try {
      const res = await fetch(API_BASE_URL + '/api/loans/request', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          amount_requested: Number(amountRequested),
          reason_category: reasonCategory,
          description,
          tenure_months: Number(tenureMonths)
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchMyLoans();
        fetchSummary();
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (e) {
      console.error('Error submitting loan:', e);
      return { success: false, message: 'Server connection failed.' };
    }
  };

  const reviewLoan = async (loanId, action) => {
    if (!token) return { success: false };
    try {
      const res = await fetch(API_BASE_URL + `/api/loans/review/${loanId}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        fetchLoanQueue();
        fetchSummary();
        fetchMembers();
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message };
    } catch (e) {
      console.error('Error reviewing loan:', e);
      return { success: false, message: 'Network error.' };
    }
  };

  const addTransaction = async (userId, transactionType, amount, transactionDate = null, paymentRef = null, paymentStatus = 'SUCCESSFUL', paymentMethod = 'UPI') => {
    if (!token) return { success: false };

    let targetUserId = userId;
    let txType = transactionType;
    let txAmount = amount;
    let txDate = transactionDate;
    let ref = paymentRef;
    let status = paymentStatus;
    let method = paymentMethod;

    if (typeof userId === 'object' && userId !== null) {
      targetUserId = userId.userId || userId.user_id || user?.id;
      txType = userId.type || userId.transaction_type;
      if (txType === 'savings') txType = 'deposit';
      if (txType === 'loan_repayment') txType = 'repayment';
      txAmount = userId.amount;
      txDate = userId.transactionDate || userId.transaction_date || null;
      ref = userId.transaction_ref || userId.payment_ref || null;
      status = userId.payment_status || 'SUCCESSFUL';
      method = userId.payment_method || 'UPI';
    }

    try {
      const res = await fetch(API_BASE_URL + '/api/ledger/entry', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          user_id: targetUserId,
          transaction_type: txType,
          amount: Number(txAmount),
          transaction_date: txDate,
          payment_ref: ref,
          payment_status: status,
          payment_method: method
        })
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([
          fetchSummary(),
          fetchPassbook(),
          fetchMyLoans(),
          fetchMembers(),
          fetchNotifications()
        ]);
        return { success: true, message: data.message, entry: data.entry };
      }
      return { success: false, message: data.message };
    } catch (e) {
      console.error('Error recording entry:', e);
      return { success: false, message: 'Server offline.' };
    }
  };

  const broadcastNotice = async (title, message, meetingDatetime) => {
    if (!token) return { success: false };
    try {
      const res = await fetch(API_BASE_URL + '/api/loans/notices', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ title, message, meeting_datetime: meetingDatetime })
      });
      const data = await res.json();
      if (data.success) {
        fetchNotices();
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message };
    } catch (e) {
      console.error('Error creating notice:', e);
      return { success: false, message: 'Network failed.' };
    }
  };

  // ── UPI Payment Verification Functions ──────────────────────────────────

  const fetchPendingUpiPayments = async () => {
    if (!token || user?.role !== 'leader') return [];
    try {
      const res = await fetch(API_BASE_URL + '/api/ledger/pending-upi', { headers: getHeaders() });
      const data = await res.json();
      return data.success ? data.payments : [];
    } catch (e) {
      console.error('Error fetching pending UPI payments:', e);
      return [];
    }
  };

  const fetchMyUpiPayments = async () => {
    if (!token) return [];
    try {
      const res = await fetch(API_BASE_URL + '/api/ledger/my-upi', { headers: getHeaders() });
      const data = await res.json();
      return data.success ? data.payments : [];
    } catch (e) {
      console.error('Error fetching my UPI payments:', e);
      return [];
    }
  };

  const verifyUpiPayment = async (paymentId, action) => {
    if (!token) return { success: false, message: 'Not logged in' };
    try {
      const res = await fetch(API_BASE_URL + '/api/ledger/verify-upi', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ payment_id: paymentId, action })
      });
      const data = await res.json();
      if (data.success) {
        // Refresh all financial data after leader accepts
        await Promise.all([fetchSummary(), fetchPassbook(), fetchMembers(), fetchNotifications()]);
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message };
    } catch (e) {
      console.error('Error verifying UPI payment:', e);
      return { success: false, message: 'Network error.' };
    }
  };


  const getMathPreview = async (userId, amount) => {
    if (!token) return null;
    try {
      const res = await fetch(API_BASE_URL + `/api/ledger/math-preview?userId=${userId}&amount=${amount}`, {
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.success) return data;
      return null;
    } catch (e) {
      console.error('Error loading math preview:', e);
      return null;
    }
  };

  // ── Private Member↔Leader Chat ──────────────────────────────────

  const fetchPrivateChat = async (memberId = null) => {
    if (!token) return [];
    try {
      const url = memberId
        ? `${API_BASE_URL}/api/loans/private-chat?memberId=${memberId}`
        : `${API_BASE_URL}/api/loans/private-chat`;
      const res = await fetch(url, { headers: getHeaders() });
      const data = await res.json();
      return data.success ? data.messages : [];
    } catch (e) {
      console.error('Error fetching private chat:', e);
      return [];
    }
  };

  const sendPrivateMessage = async (message, memberId = null) => {
    if (!token) return { success: false };
    try {
      const body = { message };
      if (memberId) body.memberId = memberId;
      const res = await fetch(`${API_BASE_URL}/api/loans/private-chat`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      return data.success ? { success: true, message: data.message } : { success: false, message: data.message };
    } catch (e) {
      console.error('Error sending private message:', e);
      return { success: false, message: 'Network error' };
    }
  };


  useEffect(() => {
    setChatMessages([]);
    if (token && user) {
      fetchSummary();
      fetchNotices();
      fetchChat();
      fetchNotifications();
      if (user?.role === 'leader') {
        fetchLoanQueue();
        fetchMembers();
      } else {
        fetchMyLoans();
      }
      fetchPassbook();
    } else {
      setChatMessages([]);
      setPassbook([]);
      setMyLoans([]);
      setMembers([]);
      setNotices([]);
      setNotifications([]);
      setLoanQueue([]);
    }
  }, [token, user?.id]);

  return (
    <FinancialContext.Provider
      value={{
        summary,
        passbook,
        loanQueue,
        myLoans,
        members,
        notices,
        notifications,
        chatMessages,
        loading,
        fetchSummary,
        fetchPassbook,
        fetchLoanQueue,
        fetchMyLoans,
        fetchNotifications,
        markNotificationRead,
        fetchMembers,
        fetchNotices,
        fetchChat,
        sendChat,
        deleteChat,
        requestLoan,
        reviewLoan,
        addTransaction,
        broadcastNotice,
        getMathPreview,
        fetchPendingUpiPayments,
        fetchMyUpiPayments,
        verifyUpiPayment,
        fetchPrivateChat,
        sendPrivateMessage,
        token,
        getHeaders
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancial = () => useContext(FinancialContext);
