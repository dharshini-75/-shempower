import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LeaderGuard = ({ children }) => {
  const { token, user, loading } = useAuth();

  // Only block on loading when we have a token but no user yet (session restore)
  // If user is already set (just logged in), proceed immediately
  if (loading && !user) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-warm-cream">
        <div className="spinner-border text-brown mb-3" style={{ color: 'var(--primary-brown)' }} role="status"></div>
        <span className="text-muted fw-bold uppercase tracking-wider">Syncing Leader Session...</span>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'leader') {
    return <Navigate to="/member-dashboard" replace />;
  }

  return children;
};

export const MemberGuard = ({ children }) => {
  const { token, user, loading } = useAuth();

  // Only block on loading when we have a token but no user yet (session restore)
  if (loading && !user) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-warm-cream">
        <div className="spinner-border text-brown mb-3" style={{ color: 'var(--primary-brown)' }} role="status"></div>
        <span className="text-muted fw-bold uppercase tracking-wider">Syncing Member Session...</span>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'member') {
    return <Navigate to="/leader-dashboard" replace />;
  }

  return children;
};

export const GuestGuard = ({ children }) => {
  const { token, user, loading } = useAuth();

  // Only block on loading when we have a token but no user yet (session restore)
  if (loading && !user) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-warm-cream">
        <div className="spinner-border text-brown mb-3" style={{ color: 'var(--primary-brown)' }} role="status"></div>
        <span className="text-muted fw-bold uppercase tracking-wider">Syncing Session...</span>
      </div>
    );
  }

  if (token && user) {
    return <Navigate to={user.role === 'leader' ? '/leader-dashboard' : '/member-dashboard'} replace />;
  }

  return children;
};

export const SharedGuard = ({ children }) => {
  const { token, user, loading } = useAuth();

  // Only block on loading when we have a token but no user yet
  if (loading && !user) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-warm-cream">
        <div className="spinner-border text-brown mb-3" style={{ color: 'var(--primary-brown)' }} role="status"></div>
        <span className="text-muted fw-bold uppercase tracking-wider">Syncing Session...</span>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
