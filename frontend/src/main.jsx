import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { API_BASE_URL } from './config/api'

// Intercept relative /api/ calls and prepend API_BASE_URL for native mobile environment
const originalFetch = window.fetch;
window.fetch = function (input, init) {
  try {
    if (typeof input === 'string') {
      if (input.startsWith('/api/')) {
        return originalFetch(API_BASE_URL + input, init);
      }
    } else if (input && typeof input === 'object' && input.url) {
      if (typeof input.url === 'string' && input.url.startsWith('/api/')) {
        return originalFetch(API_BASE_URL + input.url, init);
      }
    }
  } catch (e) {
    console.error('Fetch intercept error:', e);
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
