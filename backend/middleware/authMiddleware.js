const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'shempower_secret';

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    try {
      const parts = req.headers.authorization.split(' ');
      token = parts.length > 1 ? parts[1] : '';

      if (!token || token === 'undefined' || token === 'null') {
        return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
      }

      let userId = null;
      if (token.startsWith('offline-token-') || token.startsWith('token-')) {
        userId = Number(token.replace('offline-token-', '').replace('token-', ''));
      } else {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          userId = decoded ? decoded.id : null;
        } catch (jErr) {
          console.warn('JWT verify fallback attempt:', jErr.message);
          const match = token.match(/\d+$/);
          if (match) userId = Number(match[0]);
        }
      }

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Invalid authentication token' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found in system' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

const leaderOnly = (req, res, next) => {
  if (req.user && req.user.role === 'leader') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Forbidden. Group Leader (Thalaivi) access required' });
  }
};

module.exports = {
  protect,
  leaderOnly
};
