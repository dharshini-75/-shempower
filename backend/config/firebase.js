const fs = require('fs');
const path = require('path');
const db = require('./db');
require('dotenv').config();

let chatMessages = [
  { id: 1, group_id: 1, senderId: 3, senderName: 'Sharmila', senderRole: 'member', message: 'Vanakkam Hema Akka, is the monthly SHG meeting date confirmed?', timestamp: '2026-09-01T10:00:00Z' },
  { id: 2, group_id: 1, senderId: 1, senderName: 'Hema', senderRole: 'leader', message: 'Vanakkam Sharmila. Yes, confirmed for 15th. Please bring your monthly savings deposit of ₹300.', timestamp: '2026-09-01T10:15:00Z' },
  { id: 3, group_id: 1, senderId: 2, senderName: 'Harsha', senderRole: 'member', message: 'I will be there, Hema Akka! I will also pay my active loan installment via UPI.', timestamp: '2026-09-01T11:05:00Z' }
];

let privateMessages = [];

const mockChatPath = path.join(__dirname, '..', 'shempower.chat.json');
const mockPrivateChatPath = path.join(__dirname, '..', 'shempower.private.chat.json');

function loadMockChat() {
  if (fs.existsSync(mockChatPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(mockChatPath, 'utf8'));
      if (Array.isArray(parsed)) {
        chatMessages = parsed.map(m => ({ ...m, group_id: m.group_id ? Number(m.group_id) : 1 }));
      }
    } catch (e) { saveMockChat(); }
  } else { saveMockChat(); }
}

function saveMockChat() {
  fs.writeFileSync(mockChatPath, JSON.stringify(chatMessages, null, 2), 'utf8');
}

function loadPrivateChat() {
  if (fs.existsSync(mockPrivateChatPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(mockPrivateChatPath, 'utf8'));
      if (Array.isArray(parsed)) privateMessages = parsed;
    } catch (e) { savePrivateChat(); }
  } else { savePrivateChat(); }
}

function savePrivateChat() {
  fs.writeFileSync(mockPrivateChatPath, JSON.stringify(privateMessages, null, 2), 'utf8');
}

loadMockChat();
loadPrivateChat();

module.exports = {
  admin: null,
  isMock: () => !Boolean(process.env.DATABASE_URL),

  // ── Group Chat ──────────────────────────────────────────────────────────
  getMessages: async (groupId = null) => {
    if (process.env.DATABASE_URL) {
      const targetGroup = Number(groupId || 1);
      const rows = await db.query('SELECT * FROM group_chats WHERE group_id = ? ORDER BY timestamp ASC', [targetGroup]);
      return rows.map(r => ({
        id: r.id,
        group_id: r.group_id,
        senderId: r.sender_id,
        senderName: r.sender_name,
        senderRole: r.sender_role,
        message: r.message,
        audioUrl: r.audio_url,
        timestamp: r.timestamp
      }));
    }
    loadMockChat();
    if (!groupId) return chatMessages;
    return chatMessages.filter(m => Number(m.group_id || 1) === Number(groupId));
  },

  addMessage: async (senderId, senderName, senderRole, message, audioUrl = null, groupId = 1) => {
    const date = new Date().toISOString();
    const gId = Number(groupId || 1);
    const msgText = message || '[Voice Message]';
    const audio = audioUrl || (message && message.startsWith('data:audio') ? message : null);

    if (process.env.DATABASE_URL) {
      const result = await db.query(
        'INSERT INTO group_chats (group_id, sender_id, sender_name, sender_role, message, audio_url, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gId, Number(senderId), senderName, senderRole, msgText, audio, date]
      );
      const insertId = result && result[0] ? result[0].insertId : null;
      return {
        id: insertId,
        group_id: gId,
        senderId: Number(senderId),
        senderName,
        senderRole,
        message: msgText,
        audioUrl: audio,
        timestamp: date
      };
    }

    loadMockChat();
    const newMsg = {
      id: chatMessages.length > 0 ? Math.max(...chatMessages.map(m => m.id)) + 1 : 1,
      group_id: gId,
      senderId: Number(senderId),
      senderName,
      senderRole,
      message: msgText,
      audioUrl: audio,
      timestamp: date
    };
    chatMessages.push(newMsg);
    saveMockChat();
    return newMsg;
  },

  deleteMessage: async (messageId, userId, groupId) => {
    if (process.env.DATABASE_URL) {
      const result = await db.query(
        'DELETE FROM group_chats WHERE id = ? AND sender_id = ? AND group_id = ?',
        [Number(messageId), Number(userId), Number(groupId || 1)]
      );
      return result && result[0] ? result[0].affectedRows > 0 : false;
    }

    loadMockChat();
    const index = chatMessages.findIndex(m =>
      Number(m.id) === Number(messageId) &&
      Number(m.senderId) === Number(userId) &&
      Number(m.group_id || 1) === Number(groupId)
    );
    if (index !== -1) { chatMessages.splice(index, 1); saveMockChat(); return true; }
    return false;
  },

  // ── Private Member↔Leader Chat ──────────────────────────────────────────
  getPrivateMessages: async (memberId, leaderId) => {
    if (process.env.DATABASE_URL) {
      const rows = await db.query(
        'SELECT * FROM private_chats WHERE member_id = ? AND leader_id = ? ORDER BY timestamp ASC',
        [Number(memberId), Number(leaderId)]
      );
      return rows.map(r => ({
        id: r.id,
        member_id: r.member_id,
        leader_id: r.leader_id,
        senderId: r.sender_id,
        senderName: r.sender_name,
        senderRole: r.sender_role,
        message: r.message,
        messageType: r.message_type,
        paymentData: typeof r.payment_data === 'string' ? JSON.parse(r.payment_data) : r.payment_data,
        timestamp: r.timestamp
      }));
    }

    loadPrivateChat();
    return privateMessages
      .filter(m => Number(m.member_id) === Number(memberId) && Number(m.leader_id) === Number(leaderId))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  },

  addPrivateMessage: async (memberId, leaderId, senderId, senderName, senderRole, message, messageType = 'text', paymentData = null) => {
    const date = new Date().toISOString();
    const payDataObj = paymentData ? (typeof paymentData === 'object' ? paymentData : JSON.parse(paymentData)) : null;

    if (process.env.DATABASE_URL) {
      const result = await db.query(
        'INSERT INTO private_chats (member_id, leader_id, sender_id, sender_name, sender_role, message, message_type, payment_data, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [Number(memberId), Number(leaderId), Number(senderId), senderName, senderRole, message || '', messageType, payDataObj ? JSON.stringify(payDataObj) : null, date]
      );
      const insertId = result && result[0] ? result[0].insertId : null;
      return {
        id: insertId,
        member_id: Number(memberId),
        leader_id: Number(leaderId),
        senderId: Number(senderId),
        senderName,
        senderRole,
        message: message || '',
        messageType,
        paymentData: payDataObj,
        timestamp: date
      };
    }

    loadPrivateChat();
    const newMsg = {
      id: privateMessages.length > 0 ? Math.max(...privateMessages.map(m => m.id)) + 1 : 1,
      member_id: Number(memberId),
      leader_id: Number(leaderId),
      senderId: Number(senderId),
      senderName,
      senderRole,
      message: message || '',
      messageType,
      paymentData: payDataObj,
      timestamp: date
    };
    privateMessages.push(newMsg);
    savePrivateChat();
    return newMsg;
  },

  updatePrivateChatPaymentStatus: async (upiPaymentId, newStatus) => {
    if (process.env.DATABASE_URL) {
      const rows = await db.query('SELECT * FROM private_chats WHERE payment_data IS NOT NULL');
      let changed = false;
      for (const row of rows) {
        const pData = typeof row.payment_data === 'string' ? JSON.parse(row.payment_data) : row.payment_data;
        if (pData && Number(pData.upiPaymentId) === Number(upiPaymentId)) {
          pData.status = newStatus;
          await db.query('UPDATE private_chats SET payment_data = ? WHERE id = ?', [JSON.stringify(pData), row.id]);
          changed = true;
        }
      }
      return changed;
    }

    loadPrivateChat();
    let changed = false;
    privateMessages.forEach(m => {
      if (m.paymentData && Number(m.paymentData.upiPaymentId) === Number(upiPaymentId)) {
        m.paymentData.status = newStatus;
        changed = true;
      }
    });
    if (changed) savePrivateChat();
    return changed;
  },

  deletePrivateMessage: async (messageId, userId) => {
    if (process.env.DATABASE_URL) {
      const result = await db.query('DELETE FROM private_chats WHERE id = ? AND sender_id = ?', [Number(messageId), Number(userId)]);
      return result && result[0] ? result[0].affectedRows > 0 : false;
    }

    loadPrivateChat();
    const index = privateMessages.findIndex(m =>
      Number(m.id) === Number(messageId) && Number(m.senderId) === Number(userId)
    );
    if (index !== -1) { privateMessages.splice(index, 1); savePrivateChat(); return true; }
    return false;
  }
};
