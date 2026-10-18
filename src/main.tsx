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
// (Safari, Firefox), fit them by hand: as people type, and when one appears with text in
// it already (edit mode on a long History), which typing alone never caught
if (!CSS.supports('field-sizing', 'content')) {
  const fit = (t: HTMLTextAreaElement) => {
    t.style.height = 'auto';
    t.style.height = `${t.scrollHeight + 2}px`;
  };
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t instanceof HTMLTextAreaElement && t.classList.contains('text-area')) fit(t);
  });
  new MutationObserver((records) => {
    for (const r of records)
      for (const n of r.addedNodes) {
        if (!(n instanceof HTMLElement)) continue;
        const found = n.matches('textarea.text-area') ? [n] : n.querySelectorAll('textarea.text-area');
        for (const t of found) fit(t as HTMLTextAreaElement);
      }
  }).observe(document.body, { childList: true, subtree: true });
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
