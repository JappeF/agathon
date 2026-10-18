import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/cinzel-decorative/700.css';
import '@fontsource-variable/cinzel';
import '@fontsource-variable/manrope';
import '@fontsource-variable/eb-garamond/wght-italic.css';
import './styles.css';
import App from './App';
import { UpdateToast } from './components/UpdateToast';
import { ErrorBoundary } from './components/ErrorBoundary';

// text areas grow with their text through field-sizing: content; where a browser lacks it
// (Safari for now), fit them by hand as people type
if (!CSS.supports('field-sizing', 'content')) {
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLTextAreaElement) || !t.classList.contains('text-area')) return;
    t.style.height = 'auto';
    t.style.height = `${t.scrollHeight + 2}px`;
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    {/* outside App so the SW registers even if the app itself fails to render */}
    <UpdateToast />
  </React.StrictMode>,
);
