import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ── Register PWA service worker ───────────────────────────────────────────
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((reg) => {
        console.log('[PWA] Service worker registered:', reg.scope);

        // Notify user when a new version is available
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available — you could show a toast here
              console.log('[PWA] New version available. Refresh to update.');
            }
          });
        });
      })
      .catch((err) => console.warn('[PWA] Service worker registration failed:', err));
  });
}
