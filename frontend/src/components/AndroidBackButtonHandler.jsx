import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { AlertTriangle } from 'lucide-react';

const AndroidBackButtonHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [showExitDialog, setShowExitDialog] = useState(false);
  const routeHistoryRef = useRef([]);

  // Track visited routes inside history stack for inner page navigation
  useEffect(() => {
    const currentPath = location.pathname;
    const guestPaths = ['/', '/welcome', '/login', '/register', '/reset-pin'];
    
    // Reset history when user logs out
    if (!user) {
      routeHistoryRef.current = [];
    }

    // Ignore guest onboarding paths if user is logged in
    if (user && guestPaths.includes(currentPath)) {
      return;
    }

    const history = routeHistoryRef.current;
    if (history.length === 0 || history[history.length - 1] !== currentPath) {
      if (history.length > 30) {
        history.shift();
      }
      history.push(currentPath);
    }
  }, [location.pathname, user]);

  const handleBackButton = () => {
    // 1. Check if Exit Confirmation Dialog is currently open
    if (showExitDialog) {
      setShowExitDialog(false);
      return;
    }

    // 2. Check for active UPI payment modal back button first
    const upiModalBackBtn = document.querySelector('[data-upi-modal="true"] [data-back-btn="true"]');
    if (upiModalBackBtn) {
      upiModalBackBtn.click();
      return;
    }

    // 3. Check for any visible in-page modal / overlay in the DOM and close it first
    const activeModalCloseBtn = document.querySelector(
      '.modal.show .btn-close, .modal-backdrop-warm .btn-close, .modal.show button[aria-label="Close"], .modal-backdrop-warm button[aria-label="Close"], .modal-backdrop-warm .card-glass button'
    );
    if (activeModalCloseBtn) {
      activeModalCloseBtn.click();
      return;
    }

    const currentPath = location.pathname;
    const isLeader = user?.role === 'leader';
    const isMember = user?.role === 'member';

    const isLeaderRoot = currentPath === '/leader-dashboard' || currentPath === '/leader-dashboard/';
    const isMemberRoot = currentPath === '/member-dashboard' || currentPath === '/member-dashboard/';
    const isGuestRoot = !user && (currentPath === '/welcome' || currentPath === '/login' || currentPath === '/');

    // 3. If at Root Page for the active role (or guest root): Show Exit Confirmation Dialog
    if ((isLeader && isLeaderRoot) || (isMember && isMemberRoot) || isGuestRoot) {
      setShowExitDialog(true);
      return;
    }

    // 4. Inner Page Navigation: Navigate to previous page in app route history
    const history = routeHistoryRef.current;
    
    // Remove current path from stack
    if (history.length > 0 && history[history.length - 1] === currentPath) {
      history.pop();
    }

    // Find the last valid non-guest route in history stack for logged-in users
    let previousPath = null;
    while (history.length > 0) {
      const candidate = history.pop();
      const isCandidateGuest = ['/', '/welcome', '/login', '/register', '/reset-pin'].includes(candidate);
      if (user && isCandidateGuest) {
        continue;
      }
      if (candidate !== currentPath) {
        previousPath = candidate;
        break;
      }
    }

    if (previousPath) {
      navigate(previousPath);
    } else {
      // Fallback: If stack had no previous route, navigate to role's root dashboard
      if (isLeader) {
        navigate('/leader-dashboard');
      } else if (isMember) {
        navigate('/member-dashboard');
      } else {
        navigate('/welcome');
      }
    }
  };

  const handlerRef = useRef();
  handlerRef.current = handleBackButton;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listenerPromise = App.addListener('backButton', () => {
      if (handlerRef.current) {
        handlerRef.current();
      }
    });

    return () => {
      listenerPromise.then(handle => handle.remove()).catch(() => {});
    };
  }, []);

  const handleConfirmExit = () => {
    setShowExitDialog(false);
    if (Capacitor.isNativePlatform()) {
      App.exitApp();
    }
  };

  if (!showExitDialog) return null;

  return (
    <div 
      className="modal fade show d-block animate-fade-in" 
      tabIndex="-1" 
      style={{ backgroundColor: 'rgba(25, 18, 12, 0.75)', backdropFilter: 'blur(6px)', zIndex: 1080 }}
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '380px' }}>
        <div 
          className="modal-content border-0 shadow-lg animate-scale-up"
          style={{ 
            borderRadius: '24px', 
            overflow: 'hidden',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #FFFDF9 100%)',
            border: '1px solid var(--warm-border)'
          }}
        >
          <div className="p-4 text-center d-flex flex-column align-items-center gap-3">
            <div 
              className="d-flex align-items-center justify-content-center rounded-circle p-3"
              style={{ width: '56px', height: '56px', backgroundColor: 'var(--terracotta-danger-light)', color: 'var(--terracotta-danger)' }}
            >
              <AlertTriangle size={28} />
            </div>

            <div>
              <h5 className="fw-extrabold text-brown m-0" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px' }}>
                Exit SHEmpower?
              </h5>
              <p className="text-muted small mt-1 mb-0" style={{ fontSize: '12.5px', lineHeight: '1.4' }}>
                Are you sure you want to close the application?
              </p>
            </div>

            <div className="d-flex gap-2.5 w-100 mt-2">
              <button
                type="button"
                onClick={() => setShowExitDialog(false)}
                className="btn btn-outline-brown flex-fill py-2.5 fw-bold rounded-3 border-2"
                style={{ fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                className="btn btn-brown flex-fill py-2.5 fw-bold rounded-3 border-0 text-white shadow-sm"
                style={{ backgroundColor: 'var(--terracotta-danger)', fontSize: '13px' }}
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AndroidBackButtonHandler;

