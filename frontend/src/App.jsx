import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { FinancialProvider } from './context/FinancialContext';
import ErrorBoundary from './components/ErrorBoundary';
import AndroidBackButtonHandler from './components/AndroidBackButtonHandler';

// Guards & Layouts
import { GuestGuard, LeaderGuard, MemberGuard } from './components/Guards';
import { LeaderLayout, MemberLayout } from './components/Layouts';

// Screens
import Splash from './screens/Splash';
import Welcome from './screens/Welcome';
import Login from './screens/Login';
import Register from './screens/Register';
import ResetPin from './screens/ResetPin';

// Leader Screens
import LeaderDashboard from './screens/LeaderDashboard';
import AddTransaction from './screens/AddTransaction';
import Loans from './screens/Loans';
import MemberDetails from './screens/MemberDetails';
import PostNotice from './screens/PostNotice';

// Member Screens
import MemberDashboard from './screens/MemberDashboard';
import RequestLoan from './screens/RequestLoan';

import NoticeBoard from './screens/NoticeBoard';
import Passbook from './screens/Passbook';
import Receipt from './screens/Receipt';
import Members from './screens/Members';
import Chat from './screens/Chat';
import Settings from './screens/Settings';
import Statement from './screens/Statement';

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <FinancialProvider>
          <ErrorBoundary>
            <AndroidBackButtonHandler />
            <Routes>
              {/* Root Splash Check */}
              <Route path="/" element={<Splash />} />

              {/* Guest / Onboarding Routes */}
              <Route path="/welcome" element={<GuestGuard><Welcome /></GuestGuard>} />
              <Route path="/login" element={<GuestGuard><Login /></GuestGuard>} />
              <Route path="/register" element={<GuestGuard><Register /></GuestGuard>} />
              <Route path="/reset-pin" element={<GuestGuard><ResetPin /></GuestGuard>} />

              {/* Group Leader Restricted Zone */}
              <Route element={<LeaderGuard><LeaderLayout /></LeaderGuard>}>
                <Route path="/leader-dashboard" element={<LeaderDashboard />} />
                <Route path="/leader/add-entry" element={<AddTransaction />} />
                <Route path="/leader/loans" element={<Loans />} />
                <Route path="/leader/member/:id" element={<MemberDetails />} />
                <Route path="/leader/post-notice" element={<PostNotice />} />
                <Route path="/leader/notices" element={<NoticeBoard />} />
                <Route path="/leader/chat" element={<Chat />} />
                <Route path="/leader/settings" element={<Settings />} />
                <Route path="/members" element={<Members />} />
              </Route>

              {/* Group Member Restricted Zone */}
              <Route element={<MemberGuard><MemberLayout /></MemberGuard>}>
                <Route path="/member-dashboard" element={<MemberDashboard />} />
                <Route path="/member/request-loan" element={<RequestLoan />} />
                <Route path="/notices" element={<NoticeBoard />} />
                <Route path="/member/:id" element={<MemberDetails />} />
                <Route path="/statement/:type/:id" element={<Statement />} />
                <Route path="/receipt/:id" element={<Receipt />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/settings" element={<Settings />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </ErrorBoundary>
        </FinancialProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;

