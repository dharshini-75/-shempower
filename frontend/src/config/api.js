// SHEmpower — Centralized API Base URL Configuration
export const PRODUCTION_API_URL = import.meta.env.VITE_API_BASE_URL || 'https://shempower-backend.onrender.com';

export const getApiBaseUrl = () => {
  // 1. If an online production HTTPS URL is configured (e.g. Render / Railway / custom domain)
  if (PRODUCTION_API_URL && PRODUCTION_API_URL.trim() !== '') {
    return PRODUCTION_API_URL.trim().replace(/\/$/, '');
  }

  // 2. Fallback local development LAN IP configuration
  const PC_LAN_IP = '192.168.179.86';
  const BACKEND_PORT = '5001';

  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    if (window.location.port === BACKEND_PORT) {
      return '';
    }
  }

  return `http://${PC_LAN_IP}:${BACKEND_PORT}`;
};

export const API_BASE_URL = getApiBaseUrl();

// Candidate URLs for auth fallback
export const GET_LOGIN_URLS = () => {
  const urls = [];
  const base = getApiBaseUrl();
  if (base) urls.push(base);

  // If base is HTTPS (online backend), return it directly
  if (base && base.startsWith('https://')) {
    return [base];
  }

  const BACKEND_PORT = '5001';
  const PC_LAN_IP = '192.168.179.86';

  if (!urls.includes(`http://127.0.0.1:${BACKEND_PORT}`)) {
    urls.push(`http://127.0.0.1:${BACKEND_PORT}`);
  }
  if (!urls.includes(`http://${PC_LAN_IP}:${BACKEND_PORT}`)) {
    urls.push(`http://${PC_LAN_IP}:${BACKEND_PORT}`);
  }
  return urls;
};

console.log(`[SHEmpower] API Base URL: ${API_BASE_URL || '(relative proxy)'}`);
