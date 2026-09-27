const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const ledgerRoutes = require('./routes/ledgerRoutes');
const loanRoutes = require('./routes/loanRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// API Routes mounting
app.use('/api/auth', authRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/loans', loanRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Root Welcome Endpoint
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Welcome to the SHEmpower REST API platform!',
    mathEngine: 'Reducing balance 2% interest calculations enabled.'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Server error encountered. Please check log details.' 
  });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SHEmpower Backend Server running on port ${PORT}`);
  });
}

module.exports = app;
