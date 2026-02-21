import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initializeSidePanelApp } from './panel-controller';
import '@fortawesome/fontawesome-free/css/all.min.css';
import '../styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);

requestAnimationFrame(() => {
  initializeSidePanelApp();
});
