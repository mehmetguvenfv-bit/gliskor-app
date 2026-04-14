import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

window.addEventListener('unhandledrejection', function(event) {
  const message = event.reason?.message || String(event.reason);
  const stack = event.reason?.stack || 'Stack trace yok';
  showError('Unhandled Promise Rejection', message, 'N/A', 0, 0, { stack });
});

function showError(type: string, message: string, source: string, lineno: number, colno: number, error: any) {
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
  
  const isScriptError = message === 'Script error.';
  errorDiv.innerHTML = `
    <h1 style="color: #ef4444; font-size: 24px; font-weight: bold; margin-bottom: 16px;">Uygulama Hatası (${type})</h1>
    <p style="color: #4b5563; margin-bottom: 16px;">Maalesef bir hata oluştu. Lütfen bu ekranın ekran görüntüsünü alıp bize bildirin.</p>
    <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 14px; white-space: pre-wrap; word-break: break-all; margin-bottom: 16px; color: #1f2937;">
      ${isScriptError ? 'Script Error (CORS veya Yükleme Hatası): Tarayıcı güvenliği nedeniyle detaylar gizlendi. Lütfen sayfayı tamamen yenileyin.' : message}
      <br/>
      ${source}:${lineno}:${colno}
      <br/>
      ${error?.stack || 'Stack trace yok'}
    </div>
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <button onclick="window.location.reload(true)" style="background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer; width: 100%;">
        Yeniden Yükle (Zorla)
      </button>
      <button onclick="localStorage.clear(); sessionStorage.clear(); caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => window.location.reload(true))" style="background: #ef4444; color: white; padding: 12px 24px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer; width: 100%;">
        Tüm Verileri Temizle ve Yenile
      </button>
    </div>
  `;
  document.body.appendChild(errorDiv);
}

window.onerror = function(message, source, lineno, colno, error) {
  showError('Script Error', String(message), String(source), lineno, colno, error);
  return false;
};

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element (#root) bulunamadı!');
  
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (error: any) {
  showError('Initialization Error', error.message, 'main.tsx', 0, 0, error);
}
