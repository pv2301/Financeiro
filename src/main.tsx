import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Monitor global de erros não capturados (Network, Promises, etc)
window.addEventListener('error', (event) => {
  // Detecta falha de carregamento de scripts/recursos (comum em novos deploys)
  const target = event.target as any;
  if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
    console.warn('[HUB] Falha ao carregar recurso. Possível nova versão detectada. Recarregando...');
    window.location.reload();
    return;
  }
  console.error('[Global Error Monitor]:', event.error || event.message);
}, true);

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Global Promise Monitor]:', event.reason);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
