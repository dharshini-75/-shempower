const LoanRequest = require('../models/LoanRequest');
const User = require('../models/User');
const Ledger = require('../models/Ledger');
const Notice = require('../models/Notice');
const MemberNotification = require('../models/MemberNotification');
const firebaseConfig = require('../config/firebase');
const { getOutstandingBalance, getActiveLoanMetrics } = require('./ledgerController');
const { sendPushNotification } = require('../utils/pushNotification');

const requestLoan = async (req, res) => {
  const { amount_requested, reason_category, description, tenure_months } = req.body;
  const userId = req.user.id;

  if (!amount_requested || !reason_category || !tenure_months) {
    return res.status(400).json({ success: false, message: 'Please provide amount, reason category, and tenure months' });
  }

  if (Number(amount_requested) <= 0) {
    return res.status(400).json({ success: false, message: 'Loan amount must be greater than zero' });
  }

  try {
    const existingLoans = await LoanRequest.findByUserId(userId);
    const activeLoan = existingLoans.find(l => l.status === 'approved');
    if (activeLoan) {
      return res.status(400).json({ 
        success: false, 
        message: "You already have an active loan. Please complete your current loan before requesting a new loan." 
      });
    }

    const pendingLoan = existingLoans.find(l => l.status === 'pending');
    if (pendingLoan) {
      return res.status(400).json({ 
        success: false, 
        message: "Your loan request is pending approval." 
      });
    }

    const newRequest = await LoanRequest.create(
      userId,
      Number(amount_requested),
      reason_category,
      description || '',
      Number(tenure_months),
      'pending'
    );

    // Member Notification
    const amountFormatted = Number(amount_requested).toLocaleString('en-IN');
    await MemberNotification.create(
      userId,
      newRequest.id,
      'Loan Request Submitted',
      `Your ₹${amountFormatted} loan request has been submitted.`,
      amount_requested,
      'pending'
    );

    // Push Notification to Leader
    const member = await User.findById(userId);
    if (member && member.leader_id) {
      const memberName = member.full_name;
      await sendPushNotification({
        targetUserId: member.leader_id,
        titleTa: 'புதிய கடன் கோரிக்கை',
        titleEn: 'New Loan Request',
        bodyTa: `${memberName}-இன் ₹${amountFormatted} கடன் கோரிக்கை மதிப்பாய்வுக்காக காத்திருக்கிறது.`,
        bodyEn: `A loan request of ₹${amountFormatted} by ${memberName} is pending review.`,
        data: {
          screen: '/leader/loans',
          type: 'loan_request',
          relatedId: newRequest.id,
          amount: Number(amount_requested),
          status: 'pending'
        }
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Emergency Loan request submitted successfully for Leader review',
      loan: newRequest
    });
  } catch (error) {
    console.error('Error requesting loan:', error);
    return res.status(500).json({ success: false, message: 'Server error requesting loan' });
  }
};

const getQueue = async (req, res) => {
  try {
    const leaderId = req.user.id;
    const assignedMembers = await User.findMembersByLeaderId(leaderId);
    const assignedIds = new Set(assignedMembers.map(m => m.id));
    const queue = await LoanRequest.findAll();
    
    const userMap = {};
    assignedMembers.forEach(u => {
      userMap[u.id] = u.full_name;
    });

    const enrichedQueue = queue
      .filter(l => assignedIds.has(l.user_id))
      .map(l => ({
        ...l,
        member_name: userMap[l.user_id] || 'Group Member'
      }))
      .sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.requested_date) - new Date(a.requested_date);
      });

    return res.json({ success: true, queue: enrichedQueue });
  } catch (error) {
    console.error('Error fetching loan queue:', error);
    return res.status(500).json({ success: false, message: 'Error fetching loan queue' });
  }
};

const reviewLoan = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  if (!action || (action !== 'approve' && action !== 'reject')) {
    return res.status(400).json({ success: false, message: 'Invalid action. Specify approve or reject.' });
  }

  try {
    const loan = await LoanRequest.findById(id);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan request not found' });
    }

    if (loan.status !== 'pending') {
      return res.status(400).json({ success: false, message: `This loan request has already been ${loan.status}` });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const updated = await LoanRequest.updateStatus(id, newStatus);

    if (updated) {
      const amountFormatted = Number(loan.amount_requested).toLocaleString('en-IN');
      const isApprove = action === 'approve';

      // Send Push Notification & In-App Notification to Member
      await sendPushNotification({
        targetUserId: loan.user_id,
        titleTa: isApprove ? 'கடன் அனுமதிக்கப்பட்டது' : 'கடன் நிராகரிக்கப்பட்டது',
        titleEn: isApprove ? 'Loan Approved' : 'Loan Rejected',
        bodyTa: isApprove
          ? `உங்கள் ₹${amountFormatted} கடன் கோரிக்கை குழுத் தலைவியால் அனுமதிக்கப்பட்டது.`
          : `உங்கள் ₹${amountFormatted} கடன் கோரிக்கை குழுத் தலைவியால் நிராகரிக்கப்பட்டது.`,
        bodyEn: isApprove
          ? `Your ₹${amountFormatted} loan request has been approved.`
          : `Your ₹${amountFormatted} loan request has been rejected.`,
        data: {
          screen: '/member-dashboard',
          type: isApprove ? 'loan_approved' : 'loan_rejected',
          relatedId: loan.id,
          amount: Number(loan.amount_requested),
          status: newStatus
        }
      });

      return res.json({ 
        success: true, 
        message: `Loan request successfully ${newStatus} and notification sent to member.` 
      });
    } else {
      return res.status(400).json({ success: false, message: 'Failed to update loan request status' });
    }
  } catch (error) {
    console.error('Error reviewing loan:', error);
    return res.status(500).json({ success: false, message: 'Server error during loan review' });
  }
};

const getMyNotifications = async (req, res) => {
  const userId = req.user.id;
  try {
    const notifications = await MemberNotification.findByUserId(userId);
    return res.json({ success: true, notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ success: false, message: 'Error fetching notifications' });
  }
};

const markNotificationRead = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    if (id === 'all') {
      await MemberNotification.markAllAsRead(userId);
    } else {
      await MemberNotification.markAsRead(id, userId);
    }
    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification read:', error);
    return res.status(500).json({ success: false, message: 'Error marking notification' });
  }
};

const getMyLoans = async (req, res) => {
  const userId = req.user.id;
  try {
    const myLoans = await LoanRequest.findByUserId(userId);
    const enrichedLoans = await Promise.all(myLoans.map(async (loan) => {
      if (loan.status === 'approved') {
        const metrics = await getActiveLoanMetrics(userId);
        return {
          ...loan,
          asalPaid: metrics.activeAmountPaid,
          interestPaid: metrics.activeInterestPaid,
          remainingBalance: metrics.activeRemainingLoan
        };
      }
      return loan;
    }));
    return res.json({ success: true, loans: enrichedLoans });
  } catch (error) {
    console.error('Error fetching my loans:', error);
    return res.status(500).json({ success: false, message: 'Error fetching loans' });
  }
};

const getMemberDirectory = async (req, res) => {
  try {
    const leaderId = req.user.id;
    const members = await User.findMembersByLeaderId(leaderId);
    const allLedger = await Ledger.findAll();
    const directory = [];

    for (const member of members) {
      const activeMetrics = await getActiveLoanMetrics(member.id);
      
      const memberDeposits = allLedger
        .filter(e => e.user_id === member.id && e.transaction_type === 'deposit')
        .reduce((sum, e) => sum + Number(e.total_paid), 0);

      directory.push({
        id: member.id,
        full_name: member.full_name,
        mobile_number: member.mobile_number,
        role: member.role,
        leader_id: member.leader_id,
        lifetime_savings: memberDeposits,
        total_loan_amount: activeMetrics ? activeMetrics.activeLoanAmount : 0,
        amount_paid: activeMetrics ? activeMetrics.activeAmountPaid : 0,
        interest_paid: activeMetrics ? activeMetrics.activeInterestPaid : 0,
        outstanding_loan: activeMetrics ? activeMetrics.activeRemainingLoan : 0,
        status_tag: (activeMetrics && activeMetrics.activeRemainingLoan > 0) ? 'Due Pending' : 'Clear'
      });
    }

    return res.json({ success: true, directory });
  } catch (error) {
    console.error('Error fetching directory:', error);
    return res.status(500).json({ success: false, message: 'Server error loading directory' });
  }
};

const getMemberDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const member = await User.findById(id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const activeMetrics = await getActiveLoanMetrics(member.id);
    const ledger = await Ledger.findByUserId(member.id);
    const loans = await LoanRequest.findByUserId(member.id);

    const lifetimeSavings = ledger
      .filter(e => e.transaction_type === 'deposit')
      .reduce((sum, e) => sum + Number(e.total_paid), 0);

    return res.json({
      success: true,
      member: {
        id: member.id,
        full_name: member.full_name,
        mobile_number: member.mobile_number,
        role: member.role,
        status: member.status,
        created_at: member.created_at,
        lifetime_savings: lifetimeSavings,
        total_loan_amount: activeMetrics ? activeMetrics.activeLoanAmount : 0,
        amount_paid: activeMetrics ? activeMetrics.activeAmountPaid : 0,
        interest_paid: activeMetrics ? activeMetrics.activeInterestPaid : 0,
        outstanding_loan: activeMetrics ? activeMetrics.activeRemainingLoan : 0,
        status_tag: (activeMetrics && activeMetrics.activeRemainingLoan > 0) ? 'Due Pending' : 'Clear'
      },
      ledger_history: ledger,
      loan_history: loans
    });
  } catch (error) {
    console.error('Error fetching member details:', error);
    return res.status(500).json({ success: false, message: 'Error loading member profile' });
  }
};

const getChatMessages = async (req, res) => {
  try {
    const groupId = req.user.role === 'leader' ? req.user.id : (req.user.leader_id || req.user.id || 1);
    const messages = await firebaseConfig.getMessages(groupId);
    return res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching chat:', error);
    return res.status(500).json({ success: false, message: 'Error loading chat messages' });
  }
};

const sendChatMessage = async (req, res) => {
  const { message, audioUrl } = req.body;
  if (!message && !audioUrl) {
    return res.status(400).json({ success: false, message: 'Message content or audio recording required' });
  }

  try {
    const groupId = req.user.role === 'leader' ? req.user.id : (req.user.leader_id || req.user.id || 1);
    const newMsg = await firebaseConfig.addMessage(
      req.user.id,
      req.user.full_name,
      req.user.role,
      message || '[Voice Message]',
      audioUrl,
      groupId
    );
    return res.status(201).json({ success: true, message: newMsg });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ success: false, message: 'Error sending message' });
  }
};

const deleteChatMessage = async (req, res) => {
  const { id } = req.params;
  try {
    const groupId = req.user.role === 'leader' ? req.user.id : (req.user.leader_id || req.user.id || 1);
    const success = await firebaseConfig.deleteMessage(id, req.user.id, groupId);
    if (success) {
      return res.json({ success: true, message: 'Message deleted successfully' });
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized or message not found' });
    }
  } catch (error) {
    console.error('Error deleting message:', error);
    return res.status(500).json({ success: false, message: 'Error deleting message' });
  }
};

const getNoticesList = async (req, res) => {
  try {
    const notices = await Notice.findAll();
    return res.json({ success: true, notices });
  } catch (error) {
    console.error('Error fetching notices:', error);
    return res.status(500).json({ success: false, message: 'Error loading notices' });
  }
};

const createNotice = async (req, res) => {
  const { title, message, meeting_datetime } = req.body;

  if (!title || !message) {
    return res.status(400).json({ success: false, message: 'Notice title and message content required' });
  }

  try {
    const newNotice = await Notice.create(title, message, meeting_datetime);
    return res.status(201).json({
      success: true,
      message: 'Notice broadcasted successfully',
      notice: newNotice
    });
  } catch (error) {
    console.error('Error creating notice:', error);
    return res.status(500).json({ success: false, message: 'Error broadcasting notice' });
  }
};

// ── Private Member↔Leader Chat ──────────────────────────────────────────────

const getPrivateChatMessages = async (req, res) => {
  try {
    // Leader requests: ?memberId=X or ?member_id=X
    // Member requests: uses their own id + leader_id
    let memberId, leaderId;

    if (req.user.role === 'leader') {
      memberId = req.query.memberId || req.query.member_id;
      leaderId = req.user.id;
      if (!memberId) {
        return res.status(400).json({ success: false, message: 'memberId query param required for leader.' });
      }
    } else {
      memberId = req.user.id;
      leaderId = req.user.leader_id;
      if (!leaderId) {
        return res.status(400).json({ success: false, message: 'No leader assigned to this member.' });
      }
    }

    const messages = await firebaseConfig.getPrivateMessages(memberId, leaderId);
    return res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching private chat:', error);
    return res.status(500).json({ success: false, message: 'Error loading private chat messages' });
  }
};

const sendPrivateChatMessage = async (req, res) => {
  const { message, memberId: bodyMemberId } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, message: 'Message content required' });
  }

  try {
    let memberId, leaderId;
    if (req.user.role === 'leader') {
      memberId = bodyMemberId;
      leaderId = req.user.id;
      if (!memberId) {
        return res.status(400).json({ success: false, message: 'memberId required for leader messages.' });
      }
    } else {
      memberId = req.user.id;
      leaderId = req.user.leader_id;
    }

    const newMsg = await firebaseConfig.addPrivateMessage(
      memberId, leaderId,
      req.user.id, req.user.full_name, req.user.role,
      message, 'text'
    );
    return res.status(201).json({ success: true, message: newMsg });
  } catch (error) {
    console.error('Error sending private message:', error);
    return res.status(500).json({ success: false, message: 'Error sending private message' });
  }
};

const deletePrivateChatMessage = async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await firebaseConfig.deletePrivateMessage(id, req.user.id);
    if (deleted) {
      return res.json({ success: true, message: 'Message deleted' });
    }
    return res.status(403).json({ success: false, message: 'Cannot delete this message' });
  } catch (error) {
    console.error('Error deleting private message:', error);
    return res.status(500).json({ success: false, message: 'Error deleting message' });
  }
};

module.exports = {
  requestLoan,
  getQueue,
  reviewLoan,
  getMyLoans,
  getMyNotifications,
  markNotificationRead,
  getMemberDirectory,
  getMemberDetails,
  getChatMessages,
  sendChatMessage,
  deleteChatMessage,
  getNoticesList,
  createNotice,
  getPrivateChatMessages,
  sendPrivateChatMessage,
  deletePrivateChatMessage
};
