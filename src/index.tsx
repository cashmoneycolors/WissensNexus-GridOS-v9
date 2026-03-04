import React from 'react';
import ReactDOM from 'react-dom/client';
import AppGridOS from './AppGridOS';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root nicht gefunden.');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppGridOS />
  </React.StrictMode>
);
