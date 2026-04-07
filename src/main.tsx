import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

window.onerror = function(message, source, lineno, colno, error) {
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.width = '100%';
  errorDiv.style.height = '100%';
  errorDiv.style.backgroundColor = 'white';
  errorDiv.style.color = 'red';
  errorDiv.style.padding = '20px';
  errorDiv.style.zIndex = '9999';
  errorDiv.style.overflow = 'auto';
  errorDiv.innerHTML = `
    <h1>Uygulama Hatası</h1>
    <p>Maalesef bir hata oluştu. Lütfen bu ekranın ekran görüntüsünü alıp bize bildirin.</p>
    <pre>${message}\n${source}:${lineno}:${colno}\n${error?.stack}</pre>
    <button onclick="location.reload()" style="padding: 10px 20px; background: #2DFF73; border: none; border-radius: 5px; cursor: pointer;">Yeniden Yükle</button>
  `;
  document.body.appendChild(errorDiv);
  return false;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
