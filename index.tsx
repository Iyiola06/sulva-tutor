
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Service Worker Registration for PWA
// Disabled in preview environment due to origin mismatch restrictions
/*
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { scope: './' })
      .then(registration => {
        console.log('SulvaTutor SW registered: ', registration.scope);
      })
      .catch(err => {
        console.error('SulvaTutor SW registration failed: ', err);
      });
  });
}
*/

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
