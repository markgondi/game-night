import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// localStorage shim for window.storage — same API the app already uses.
if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    get:    async (k) => { const v = localStorage.getItem(k); return v ? { value: v } : null; },
    set:    async (k, v) => { localStorage.setItem(k, v); },
    delete: async (k) => { localStorage.removeItem(k); },
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
