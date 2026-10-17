import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/cinzel-decorative/700.css';
import '@fontsource-variable/cinzel';
import '@fontsource-variable/manrope';
import '@fontsource-variable/eb-garamond/wght-italic.css';
import './styles.css';
import App from './App';
import { UpdateToast } from './components/UpdateToast';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    {/* outside App so the SW registers even if the app itself fails to render */}
    <UpdateToast />
  </React.StrictMode>,
);
