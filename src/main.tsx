import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Monitor global de erros não capturados (Network, Promises, etc)
window.addEventListener('error', (event) => {
  console.error('[Global Error Monitor]:', event.error || event.message);
});

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
