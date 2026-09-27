import React from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Home, 
  BookOpen, 
  HandCoins, 
  Users, 
  MessageSquare, 
  Settings as SettingsIcon, 
  LogOut,
  Globe,
  Crown,
  Megaphone
} from 'lucide-react';

import logoImg from '../assets/logo.png';

export const LeaderLayout = () => {
  const { user, logout, toggleLanguage, language, t } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="container-fluid">
      <div className="row">
        {/* Sidebar Nav */}
        <nav className="col-md-3 col-lg-2 sidebar-layout d-md-flex d-none">
          <div>
            <Link to="/leader-dashboard" className="sidebar-brand d-flex align-items-center gap-2">
              <img src={logoImg} alt="SHEmpower Logo" style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '6px' }} />
              <span>{t.appTitle}</span>
            </Link>
            
            <div className="sidebar-menu">
              <NavLink to="/leader-dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Home size={18} />
                <span>{t.home}</span>
              </NavLink>

              <NavLink to="/leader/add-entry" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <BookOpen size={18} />
                <span>{t.addEntry}</span>
              </NavLink>

              <NavLink to="/leader/loans" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <HandCoins size={18} />
                <span>{t.reviewLoans}</span>
              </NavLink>

              <NavLink to="/members" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Users size={18} />
                <span>{t.memberDirectory}</span>
              </NavLink>

              <NavLink to="/leader/chat" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <MessageSquare size={18} />
                <span>{t.groupChat}</span>
              </NavLink>

              <NavLink to="/leader/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <SettingsIcon size={18} />
                <span>{t.settings}</span>
              </NavLink>
            </div>
          </div>

          <div className="mt-auto pt-3 border-top border-light">
            <div className="d-flex align-items-center justify-content-between mb-3 px-2">
              <div className="small text-muted flex-grow-1 text-truncate" title={user?.full_name}>
                <strong>{user?.full_name}</strong>
                <div style={{ fontSize: '10px' }}>{t.roleLeader}</div>
              </div>
              <button 
                onClick={toggleLanguage} 
                className="btn btn-sm btn-outline-brown p-1 py-0 d-flex align-items-center gap-1"
                style={{ fontSize: '11px' }}
              >
                <Globe size={11} />
                <span>{t.languageToggle}</span>
              </button>
            </div>
            <button onClick={handleLogout} className="btn w-full btn-outline-danger d-flex align-items-center justify-content-center gap-2" style={{ borderRadius: '8px' }}>
              <LogOut size={16} />
              <span>{t.logout}</span>
            </button>
          </div>
        </nav>

        {/* Responsive Mobile Header */}
        <div className="col-12 d-md-none bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center mobile-safe-header">
          <Link to="/leader-dashboard" className="text-decoration-none h4 m-0 font-weight-bold text-brown d-flex align-items-center gap-2" style={{ color: 'var(--primary-brown)' }}>
            <img src={logoImg} alt="SHEmpower Logo" style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '6px' }} />
            <strong style={{ fontFamily: "'Outfit', sans-serif" }}>SHEmpower</strong>
          </Link>
          <div className="d-flex align-items-center gap-2">
            <button onClick={toggleLanguage} className="btn btn-sm btn-outline-brown px-2 py-1" style={{ fontSize: '12px', borderRadius: '8px' }}>
              {t.languageToggle}
            </button>
            <button onClick={handleLogout} className="btn btn-sm btn-outline-danger p-2" title={t.logout} style={{ borderRadius: '8px' }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Main Content Pane */}
        <main className="col-md-9 ms-sm-auto col-lg-10 px-md-5 py-4 safe-wrapper" style={{ minHeight: '100vh' }}>
          <Outlet />
        </main>
      </div>

      {/* Floating Mobile Bottom Navigation Bar */}
      <div className="mobile-bottom-bar d-flex d-md-none">
        <NavLink to="/leader-dashboard" className={({ isActive }) => `mobile-bottom-bar-item ${isActive ? 'active' : ''}`}>
          <Home size={20} />
          <span>{t.home}</span>
        </NavLink>
        <NavLink to="/leader/add-entry" className={({ isActive }) => `mobile-bottom-bar-item ${isActive ? 'active' : ''}`}>
          <BookOpen size={20} />
          <span>{t.addEntry}</span>
        </NavLink>
        <NavLink to="/leader/loans" className={({ isActive }) => `mobile-bottom-bar-item ${isActive ? 'active' : ''}`}>
          <HandCoins size={20} />
          <span>{t.reviewLoans}</span>
        </NavLink>
        <NavLink to="/members" className={({ isActive }) => `mobile-bottom-bar-item ${isActive ? 'active' : ''}`}>
          <Users size={20} />
          <span>{t.members}</span>
        </NavLink>
        <NavLink to="/leader/chat" className={({ isActive }) => `mobile-bottom-bar-item ${isActive ? 'active' : ''}`}>
          <MessageSquare size={20} />
          <span>{t.groupChat}</span>
        </NavLink>
        <NavLink to="/leader/settings" className={({ isActive }) => `mobile-bottom-bar-item ${isActive ? 'active' : ''}`}>
          <SettingsIcon size={20} />
          <span>{t.settings}</span>
        </NavLink>
      </div>
    </div>
  );
};

export const MemberLayout = () => {
  const { user, logout, toggleLanguage, language, t } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const handleNavClick = (targetPath, label) => {
    console.log(`[MemberLayout] ${label} CLICKED -> Navigating to ${targetPath}`);
    navigate(targetPath);
  };

  return (
    <div className="bg-warm-cream min-vh-100">
      {/* Top Navbar */}
      <header className="topbar-layout sticky-top shadow-sm mobile-safe-header py-3 px-4" style={{ zIndex: 1040 }}>
        <Link to="/member-dashboard" className="topbar-brand d-flex align-items-center gap-2">
          <img src={logoImg} alt="SHEmpower Logo" style={{ width: '30px', height: '30px', objectFit: 'contain', borderRadius: '6px' }} />
          <strong style={{ fontFamily: "'Outfit', sans-serif" }}>SHEmpower</strong>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="d-none d-md-flex align-items-center gap-4 me-auto ms-4">
          <button 
            onClick={() => handleNavClick('/member-dashboard', 'HOME')} 
            className={`btn btn-link p-0 text-decoration-none fw-bold ${isActive('/member-dashboard') ? 'text-brown' : 'text-muted'}`}
          >
            {t.home}
          </button>
          <button 
            onClick={() => handleNavClick('/chat', 'GROUP CHAT')} 
            className={`btn btn-link p-0 text-decoration-none fw-bold ${isActive('/chat') ? 'text-brown' : 'text-muted'}`}
          >
            {t.groupChat}
          </button>
          <button 
            onClick={() => handleNavClick('/notices', 'NOTICE BOARD')} 
            className={`btn btn-link p-0 text-decoration-none fw-bold ${isActive('/notices') ? 'text-brown' : 'text-muted'}`}
          >
            {t.noticeBoard}
          </button>
          <button 
            onClick={() => handleNavClick('/settings', 'SETTINGS')} 
            className={`btn btn-link p-0 text-decoration-none fw-bold ${isActive('/settings') ? 'text-brown' : 'text-muted'}`}
          >
            {t.settings}
          </button>
        </div>

        {/* Right side items */}
        <div className="d-flex align-items-center gap-2">
          <button 
            onClick={toggleLanguage} 
            className="btn btn-sm btn-outline-brown d-flex align-items-center gap-1"
            style={{ fontSize: '12px', borderRadius: '8px' }}
          >
            <Globe size={13} />
            <span>{t.languageToggle}</span>
          </button>
          
          <button onClick={handleLogout} className="btn btn-outline-danger btn-sm p-2" title={t.logout} style={{ borderRadius: '8px' }}>
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Main Content Pane */}
      <main className="container py-3 px-3 safe-wrapper">
        <Outlet />
      </main>

      {/* Floating Mobile Bottom Navigation Bar for Members: Home | Group Chat | Notice Board | Settings */}
      <div className="mobile-bottom-bar d-flex d-md-none" style={{ zIndex: 1050, pointerEvents: 'auto' }}>
        <button 
          onClick={() => handleNavClick('/member-dashboard', 'HOME')} 
          className={`mobile-bottom-bar-item border-0 bg-transparent ${isActive('/member-dashboard') ? 'active' : ''}`}
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        >
          <Home size={20} style={{ pointerEvents: 'none' }} />
          <span style={{ pointerEvents: 'none' }}>{t.home}</span>
        </button>

        <button 
          onClick={() => handleNavClick('/chat', 'GROUP CHAT')} 
          className={`mobile-bottom-bar-item border-0 bg-transparent ${isActive('/chat') ? 'active' : ''}`}
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        >
          <MessageSquare size={20} style={{ pointerEvents: 'none' }} />
          <span style={{ pointerEvents: 'none' }}>{t.groupChat}</span>
        </button>

        <button 
          onClick={() => handleNavClick('/notices', 'NOTICE BOARD')} 
          className={`mobile-bottom-bar-item border-0 bg-transparent ${isActive('/notices') ? 'active' : ''}`}
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        >
          <Megaphone size={20} style={{ pointerEvents: 'none' }} />
          <span style={{ pointerEvents: 'none' }}>{t.noticeBoard}</span>
        </button>

        <button 
          onClick={() => handleNavClick('/settings', 'SETTINGS')} 
          className={`mobile-bottom-bar-item border-0 bg-transparent ${isActive('/settings') ? 'active' : ''}`}
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        >
          <SettingsIcon size={20} style={{ pointerEvents: 'none' }} />
          <span style={{ pointerEvents: 'none' }}>{t.settings}</span>
        </button>
      </div>
    </div>
  );
};
