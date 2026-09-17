import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeDatabase } from './services/db';
import './styles/base.css';

// Initialize seed data if not present
initializeDatabase();

// Register Service Worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('PWA Service Worker registration failed: ', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
