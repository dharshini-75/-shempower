const Ledger = require('../models/Ledger');
const LoanRequest = require('../models/LoanRequest');
const User = require('../models/User');
const UpiPayment = require('../models/UpiPayment');
const MemberNotification = require('../models/MemberNotification');
const firebaseConfig = require('../config/firebase');
const { calculateReducingBalance } = require('../utils/mathEngine');
const { sendPushNotification } = require('../utils/pushNotification');

// Helper to calculate a user's current active outstanding loan balance
async function getOutstandingBalance(userId) {
  const loans = await LoanRequest.findByUserId(userId);
  const approvedLoan = loans.find(l => l.status === 'approved');

  if (!approvedLoan) {
    return 0;
  }

  const loanDate = new Date(approvedLoan.requested_date);
  const ledgerEntries = await Ledger.findByUserId(userId);
  const repayments = ledgerEntries.filter(e => e.transaction_type === 'repayment' && (e.payment_status === 'SUCCESSFUL' || !e.payment_status) && new Date(e.transaction_date) >= loanDate);

  if (repayments.length === 0) {
    return Number(approvedLoan.amount_requested);
  }

  const sortedRepayments = [...repayments].sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
  const rem = Number(sortedRepayments[0].remaining_balance);
  return rem <= 1 ? 0 : rem;
}

async function getActiveLoanMetrics(userId) {
  const loans = await LoanRequest.findByUserId(userId);
  const activeLoan = loans.find(l => l.status === 'approved');

  if (!activeLoan) {
    return {
      activeLoanAmount: 0,
      activeAmountPaid: 0,
      activeInterestPaid: 0,
      activeRemainingLoan: 0
    };
  }

  const loanDate = new Date(activeLoan.requested_date);
  const ledgerEntries = await Ledger.findByUserId(userId);
  const repayments = ledgerEntries.filter(e => e.transaction_type === 'repayment' && (e.payment_status === 'SUCCESSFUL' || !e.payment_status) && new Date(e.transaction_date) >= loanDate);
  const sortedRepayments = [...repayments].sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

  let currentBalance = Number(activeLoan.amount_requested);
  if (sortedRepayments.length > 0) {
    currentBalance = Number(sortedRepayments[0].remaining_balance);
  }

  if (currentBalance <= 1) {
    await LoanRequest.updateStatus(activeLoan.id, 'completed');
    return {
      activeLoanAmount: 0,
      activeAmountPaid: 0,
      activeInterestPaid: 0,
      activeRemainingLoan: 0
    };
  }

  const activeAmountPaid = repayments.reduce((sum, e) => sum + Number(e.asal_amount || 0), 0);
  const activeInterestPaid = repayments.reduce((sum, e) => sum + Number(e.vatti_amount || 0), 0);

  return {
    activeLoanAmount: Number(activeLoan.amount_requested),
    activeAmountPaid,
    activeInterestPaid,
    activeRemainingLoan: currentBalance
  };
}

const getPassbook = async (req, res) => {
  const { role, id } = req.user;
  const { memberId, month } = req.query;

  try {
    let entries = [];

    if (role === 'leader') {
      if (memberId) {
        entries = await Ledger.findByUserId(memberId);
      } else {
        const assignedMembers = await User.findMembersByLeaderId(id);
        const assignedIds = new Set(assignedMembers.map(m => m.id));
        const allEntries = await Ledger.findAll();
        entries = allEntries.filter(e => assignedIds.has(e.user_id));
      }
    } else {
      // Member can only view their own passbook
      entries = await Ledger.findByUserId(id);
    }

    // Only include SUCCESSFUL entries in passbook
    entries = entries.filter(e => e.payment_status === 'SUCCESSFUL' || !e.payment_status);

    // Apply month filtering if requested (format: YYYY-MM)
    if (month) {
      entries = entries.filter(e => {
        const entryDate = new Date(e.transaction_date);
        const yyyy = entryDate.getFullYear();
        const mm = String(entryDate.getMonth() + 1).padStart(2, '0');
        return `${yyyy}-${mm}` === month;
      });
    }

    // Attach user names to entries if viewed by leader
    const users = await User.findAll();
    const userMap = {};
    users.forEach(u => {
      userMap[u.id] = u.full_name;
    });

    const entriesWithNames = entries.map(e => ({
      ...e,
      member_name: userMap[e.user_id] || 'Unknown Member'
    }));

    return res.json({ success: true, ledger: entriesWithNames });
  } catch (error) {
    console.error('Error fetching passbook:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching passbook' });
  }
};

const getMathPreview = async (req, res) => {
  const { userId, amount } = req.query;

  if (!userId || !amount) {
    return res.status(400).json({ success: false, message: 'Missing userId or amount' });
  }

  try {
    const currentBalance = await getOutstandingBalance(userId);
    const mathResult = calculateReducingBalance(currentBalance, Number(amount));

    return res.json({
      success: true,
      currentBalance,
      amountPaid: Number(amount),
      vattiPaid: mathResult.vattiPaid,
      asalPaid: mathResult.asalPaid,
      newBalance: mathResult.newBalance
    });
  } catch (error) {
    console.error('Error in math engine preview:', error);
    return res.status(500).json({ success: false, message: 'Error calculating interest preview' });
  }
};

const addTransaction = async (req, res) => {
  const { user_id, transaction_type, amount, transaction_date, payment_ref, payment_status, payment_method } = req.body;

  if (!user_id || !transaction_type || !amount) {
    return res.status(400).json({ success: false, message: 'Please provide user_id, transaction_type, and amount' });
  }

  if (Number(amount) <= 0) {
    return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
  }

  try {
    const member = await User.findById(user_id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'SHG Member not found' });
    }

    let asalAmount = 0;
    let vattiAmount = 0;
    let remainingBalance = 0;

    if (transaction_type === 'deposit') {
      asalAmount = Number(amount);
      vattiAmount = 0;
      remainingBalance = await getOutstandingBalance(user_id);
    } else if (transaction_type === 'withdrawal') {
      const userEntries = await Ledger.findByUserId(user_id);
      const currentSavings = userEntries
        .filter(e => (e.payment_status === 'SUCCESSFUL' || !e.payment_status) && (e.transaction_type === 'deposit' || e.transaction_type === 'withdrawal'))
        .reduce((sum, e) => sum + Number(e.total_paid || 0), 0);

      if (Number(amount) > currentSavings) {
        return res.status(400).json({
          success: false,
          message: `Withdrawal amount (₹${amount}) cannot exceed available savings balance (₹${currentSavings})`
        });
      }

      asalAmount = -Number(amount);
      vattiAmount = 0;
      remainingBalance = await getOutstandingBalance(user_id);
    } else if (transaction_type === 'repayment') {
      const currentBalance = await getOutstandingBalance(user_id);
      if (currentBalance <= 0) {
        return res.status(400).json({ success: false, message: 'Member does not have any active outstanding loan' });
      }

      if (Number(amount) >= currentBalance) {
        // Full payoff
        vattiAmount = Number((currentBalance * 0.02).toFixed(2));
        asalAmount = Number(currentBalance);
        remainingBalance = 0;

        const userLoans = await LoanRequest.findByUserId(user_id);
        const activeLoan = userLoans.find(l => l.status === 'approved');
        if (activeLoan) {
          await LoanRequest.updateStatus(activeLoan.id, 'completed');
        }
      } else {
        const mathResult = calculateReducingBalance(currentBalance, Number(amount));
        asalAmount = mathResult.asalPaid;
        vattiAmount = mathResult.vattiPaid;
        remainingBalance = mathResult.newBalance;

        if (remainingBalance <= 1) {
          remainingBalance = 0;
          const userLoans = await LoanRequest.findByUserId(user_id);
          const activeLoan = userLoans.find(l => l.status === 'approved');
          if (activeLoan) {
            await LoanRequest.updateStatus(activeLoan.id, 'completed');
          }
        }
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid transaction type. Use deposit, withdrawal, or repayment.' });
    }

    const newEntry = await Ledger.create(
      user_id,
      transaction_type,
      asalAmount,
      vattiAmount,
      transaction_type === 'withdrawal' ? -Number(amount) : Number(amount),
      remainingBalance,
      transaction_date,
      payment_ref,
      payment_status || 'SUCCESSFUL',
      payment_method || 'UPI'
    );

    if (transaction_type === 'repayment') {
      const amountFormatted = Number(amount).toLocaleString('en-IN');
      await MemberNotification.create(
        user_id,
        null,
        'Loan Payment Recorded',
        `Your loan payment of ₹${amountFormatted} has been recorded.`,
        amount,
        'SUCCESSFUL'
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully in Digital Passbook',
      entry: newEntry
    });
  } catch (error) {
    console.error('Error adding transaction:', error);
    return res.status(500).json({ success: false, message: 'Server error recording transaction' });
  }
};

const getFinancialSummary = async (req, res) => {
  const { role, id } = req.user;
  const userIdNum = Number(id);

  try {
    let relevantMembers = [];
    if (role === 'leader') {
      const assignedMembers = await User.findMembersByLeaderId(userIdNum);
      const selfLeader = await User.findById(userIdNum);
      
      const memberMap = new Map();
      if (selfLeader) memberMap.set(Number(selfLeader.id), selfLeader);
      if (Array.isArray(assignedMembers)) {
        assignedMembers.forEach(m => memberMap.set(Number(m.id), m));
      }
      relevantMembers = Array.from(memberMap.values());
    } else {
      const self = await User.findById(userIdNum);
      relevantMembers = self ? [self] : [];
    }

    const memberIds = new Set(relevantMembers.map(m => Number(m.id)));
    const allLedger = await Ledger.findAll();

    let totalGroupSavings = 0;
    let totalGroupInterestPaid = 0;
    let totalGroupAmountPaid = 0;

    allLedger.forEach(e => {
      if (e.payment_status === 'SUCCESSFUL' || !e.payment_status) {
        const entryUserId = Number(e.user_id);
        if (memberIds.has(entryUserId)) {
          if (e.transaction_type === 'deposit' || e.transaction_type === 'withdrawal') {
            totalGroupSavings += Number(e.total_paid || 0);
          } else if (e.transaction_type === 'repayment') {
            totalGroupAmountPaid += Number(e.total_paid || 0);
            totalGroupInterestPaid += Number(e.vatti_amount || 0);
          }
        }
      }
    });

    let totalOutstandingLoans = 0;
    let totalActiveDisbursed = 0;
    let totalActivePaid = 0;
    let totalActiveInterestPaid = 0;

    for (const member of relevantMembers) {
      const activeMetrics = await getActiveLoanMetrics(member.id);
      totalActiveDisbursed += Number(activeMetrics.activeLoanAmount || 0);
      totalActivePaid += Number(activeMetrics.activeAmountPaid || 0);
      totalActiveInterestPaid += Number(activeMetrics.activeInterestPaid || 0);
      totalOutstandingLoans += Number(activeMetrics.activeRemainingLoan || 0);
    }

    let personalSavings = 0;
    allLedger.forEach(e => {
      if ((e.payment_status === 'SUCCESSFUL' || !e.payment_status) && Number(e.user_id) === userIdNum && (e.transaction_type === 'deposit' || e.transaction_type === 'withdrawal')) {
        personalSavings += Number(e.total_paid || 0);
      }
    });

    const personalMetrics = await getActiveLoanMetrics(userIdNum);

    const allLoans = await LoanRequest.findAll();
    const pendingApprovalsCount = allLoans.filter(l => 
      l.status === 'pending' && memberIds.has(Number(l.user_id))
    ).length;

    let nextDuePreview = null;
    if (role === 'member' && personalMetrics.activeRemainingLoan > 0) {
      const interestDue = Number((personalMetrics.activeRemainingLoan * 0.02).toFixed(2));
      nextDuePreview = {
        outstandingBalance: personalMetrics.activeRemainingLoan,
        interestDue,
        suggestedInstallment: Number((personalMetrics.activeRemainingLoan / 10).toFixed(2)) + interestDue,
        message: `Your next monthly interest (vatti) is ₹${interestDue} (calculated at 2% reducing balance).`
      };
    }

    return res.json({
      success: true,
      summary: {
        totalMembersCount: relevantMembers.length,
        totalGroupSavings,
        totalOutstandingLoans,
        totalActiveDisbursed,
        totalActivePaid,
        totalInterestPaid: totalGroupInterestPaid || totalActiveInterestPaid,
        pendingApprovalsCount,
        personalSavings,
        personalOutstanding: personalMetrics.activeRemainingLoan,
        activeLoanAmount: personalMetrics.activeLoanAmount,
        activeAmountPaid: personalMetrics.activeAmountPaid,
        activeInterestPaid: personalMetrics.activeInterestPaid,
        activeRemainingLoan: personalMetrics.activeRemainingLoan,
        nextDuePreview
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return res.status(500).json({ success: false, message: 'Error loading financial summary' });
  }
};

// Helper for recording completed ledger entries upon leader verification
async function recordVerifiedLedgerEntry(userId, transactionType, amount, transactionDate, paymentRef) {
  const member = await User.findById(userId);
  if (!member) return null;

  let asalAmount = 0;
  let vattiAmount = 0;
  let remainingBalance = 0;

  if (transactionType === 'deposit') {
    asalAmount = Number(amount);
    vattiAmount = 0;
    remainingBalance = await getOutstandingBalance(userId);
  } else if (transactionType === 'repayment') {
    const currentBalance = await getOutstandingBalance(userId);
    if (currentBalance > 0) {
      if (Number(amount) >= currentBalance) {
        vattiAmount = Number((currentBalance * 0.02).toFixed(2));
        asalAmount = Number(currentBalance);
        remainingBalance = 0;

        const userLoans = await LoanRequest.findByUserId(userId);
        const activeLoan = userLoans.find(l => l.status === 'approved');
        if (activeLoan) {
          await LoanRequest.updateStatus(activeLoan.id, 'completed');
        }
      } else {
        const mathResult = calculateReducingBalance(currentBalance, Number(amount));
        asalAmount = mathResult.asalPaid;
        vattiAmount = mathResult.vattiPaid;
        remainingBalance = mathResult.newBalance;

        if (remainingBalance <= 1) {
          remainingBalance = 0;
          const userLoans = await LoanRequest.findByUserId(userId);
          const activeLoan = userLoans.find(l => l.status === 'approved');
          if (activeLoan) {
            await LoanRequest.updateStatus(activeLoan.id, 'completed');
          }
        }
      }
    }
  }

  return await Ledger.create(
    userId,
    transactionType,
    asalAmount,
    vattiAmount,
    Number(amount),
    remainingBalance,
    transactionDate || new Date().toISOString(),
    paymentRef,
    'SUCCESSFUL',
    'UPI'
  );
}

const submitUpiPayment = async (req, res) => {
  const { amount, payment_purpose, payment_ref, screenshot } = req.body;
  const memberId = req.user.id;
  const leaderId = req.user.leader_id;

  if (!leaderId) {
    return res.status(400).json({ success: false, message: 'No assigned Group Leader found for this member.' });
  }

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ success: false, message: 'Payment amount must be greater than ₹0.' });
  }

  const cleanPurpose = String(payment_purpose || '').toUpperCase();
  if (cleanPurpose !== 'SAVINGS' && cleanPurpose !== 'LOAN_REPAYMENT') {
    return res.status(400).json({ success: false, message: 'Invalid payment purpose. Use SAVINGS or LOAN_REPAYMENT.' });
  }

  // payment_ref is optional for screenshot-based flow — generate one if missing
  const cleanRef = String(payment_ref || `SCREENSHOT-${Date.now()}`).trim();

  try {
    // Duplicate Protection
    const existingUpi = await UpiPayment.findByRef(cleanRef);
    if (existingUpi && payment_ref) {
      return res.status(400).json({ success: false, message: 'This UPI reference has already been submitted.' });
    }

    const member = await User.findById(memberId);
    const memberName = member ? member.full_name : 'Member';

    const newPayment = await UpiPayment.create(
      memberId, leaderId, amount, cleanPurpose, cleanRef, screenshot || null, memberName
    );

    // Post a payment verification card to the private chat
    firebaseConfig.addPrivateMessage(
      memberId, leaderId,
      memberId, memberName, 'member',
      `Payment verification submitted — ₹${Math.round(Number(amount)).toLocaleString('en-IN')}`,
      'payment_request',
      {
        upiPaymentId: newPayment.id,
        amount: Number(amount),
        purpose: cleanPurpose,
        status: 'PENDING_VERIFICATION',
        screenshot: screenshot || null,
        memberName
      }
    );

    // Create Notification & Real FCM Push for Leader
    const amtSubmitFmt = Math.round(Number(amount)).toLocaleString('en-IN');
    await sendPushNotification({
      targetUserId: leaderId,
      titleTa: 'பணம் செலுத்துதல் பெறப்பட்டது',
      titleEn: 'Payment Submitted',
      bodyTa: `${memberName}-இன் ₹${amtSubmitFmt} பணம் சரிபார்ப்புக்காக காத்திருக்கிறது.`,
      bodyEn: `A payment of ₹${amtSubmitFmt} by ${memberName} is waiting for verification.`,
      data: {
        screen: '/leader-dashboard',
        type: 'payment_verification',
        relatedId: newPayment.id,
        amount: Number(amount),
        status: 'PENDING_VERIFICATION'
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Payment submitted for verification.',
      payment: newPayment
    });
  } catch (error) {
    console.error('Error submitting UPI payment:', error);
    return res.status(500).json({ success: false, message: 'Server error submitting payment.' });
  }
};

const getPendingUpiPayments = async (req, res) => {
  const leaderId = req.user.id;
  try {
    const pending = await UpiPayment.findPendingByLeaderId(leaderId);
    const users = await User.findAll();
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });

    const enriched = pending.map(p => ({
      ...p,
      member_name: userMap[p.member_id]?.full_name || 'SHG Member',
      member_mobile: userMap[p.member_id]?.mobile_number || ''
    }));

    return res.json({ success: true, payments: enriched });
  } catch (error) {
    console.error('Error fetching pending UPI payments:', error);
    return res.status(500).json({ success: false, message: 'Server error loading pending payments.' });
  }
};

const verifyUpiPayment = async (req, res) => {
  const { payment_id, action } = req.body;
  const leaderId = req.user.id;

  if (!payment_id || !action) {
    return res.status(400).json({ success: false, message: 'Please provide payment_id and action.' });
  }

  try {
    const payment = await UpiPayment.findById(payment_id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'UPI Payment record not found.' });
    }

    if (Number(payment.leader_id) !== Number(leaderId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to process this payment.' });
    }

    if (payment.payment_status !== 'PENDING_VERIFICATION') {
      return res.status(400).json({ success: false, message: 'Payment has already been processed.' });
    }

    if (action === 'verify') {
      await UpiPayment.updateStatus(payment_id, 'SUCCESSFUL', leaderId);

      const txType = payment.payment_purpose === 'SAVINGS' ? 'deposit' : 'repayment';
      await recordVerifiedLedgerEntry(payment.member_id, txType, payment.amount, payment.created_at, payment.payment_ref);

      const amountFormatted = Math.round(Number(payment.amount)).toLocaleString('en-IN');
      const title = txType === 'repayment' ? 'Loan Payment Accepted' : 'Payment Accepted';
      const message = txType === 'repayment'
        ? `Your loan repayment of ₹${amountFormatted} has been accepted by the Leader.`
        : `Your savings payment of ₹${amountFormatted} has been accepted by the Leader.`;

      // Dispatch Push Notification & In-App Notification to Member
      await sendPushNotification({
        targetUserId: payment.member_id,
        titleTa: 'பணம் செலுத்துதல் ஏற்றுக்கொள்ளப்பட்டது',
        titleEn: title,
        bodyTa: `உங்கள் ₹${amountFormatted} பணம் செலுத்துதல் குழுத் தலைவியால் ஏற்றுக்கொள்ளப்பட்டது.`,
        bodyEn: message,
        data: {
          screen: '/member-dashboard',
          type: 'payment_accepted',
          relatedId: payment_id,
          amount: Number(payment.amount),
          status: 'SUCCESSFUL'
        }
      });

      // Update private chat card status and post system message
      firebaseConfig.updatePrivateChatPaymentStatus(payment_id, 'SUCCESSFUL');
      const leader = await User.findById(leaderId);
      firebaseConfig.addPrivateMessage(
        payment.member_id, leaderId,
        leaderId, leader ? leader.full_name : 'Leader', 'leader',
        `✅ Payment of ₹${amountFormatted} has been accepted by Leader.`,
        'system'
      );

      return res.json({ success: true, message: 'Payment accepted and recorded in passbook.' });

    } else if (action === 'reject') {
      await UpiPayment.updateStatus(payment_id, 'REJECTED', leaderId);

      const amtFmt = Math.round(Number(payment.amount)).toLocaleString('en-IN');
      
      // Dispatch Push Notification & In-App Notification to Member
      await sendPushNotification({
        targetUserId: payment.member_id,
        titleTa: 'பணம் செலுத்துதல் நிராகரிக்கப்பட்டது',
        titleEn: 'Payment Rejected',
        bodyTa: `உங்கள் ₹${amtFmt} பணம் செலுத்துதல் குழுத் தலைவியால் நிராகரிக்கப்பட்டது.`,
        bodyEn: `Your payment of ₹${amtFmt} has been rejected by the Leader.`,
        data: {
          screen: '/member-dashboard',
          type: 'payment_rejected',
          relatedId: payment_id,
          amount: Number(payment.amount),
          status: 'REJECTED'
        }
      });

      // Update private chat card status and post system message
      firebaseConfig.updatePrivateChatPaymentStatus(payment_id, 'REJECTED');
      const leader = await User.findById(leaderId);
      firebaseConfig.addPrivateMessage(
        payment.member_id, leaderId,
        leaderId, leader ? leader.full_name : 'Leader', 'leader',
        `❌ Payment of ₹${amtFmt} has been rejected by Leader.`,
        'system'
      );

      return res.json({ success: true, message: 'Payment request rejected.' });

    } else {
      return res.status(400).json({ success: false, message: 'Invalid action. Use verify or reject.' });
    }
  } catch (error) {
    console.error('Error processing UPI payment verification:', error);
    return res.status(500).json({ success: false, message: 'Server error verifying payment.' });
  }
};

const getMyUpiPayments = async (req, res) => {
  const memberId = req.user.id;
  try {
    const payments = await UpiPayment.findByMemberId(memberId);
    return res.json({ success: true, payments });
  } catch (error) {
    console.error('Error fetching member UPI payments:', error);
    return res.status(500).json({ success: false, message: 'Server error loading UPI payments.' });
  }
};

module.exports = {
  getPassbook,
  getMathPreview,
  addTransaction,
  getFinancialSummary,
  getOutstandingBalance,
  getActiveLoanMetrics,
  submitUpiPayment,
  getPendingUpiPayments,
  verifyUpiPayment,
  getMyUpiPayments
};
