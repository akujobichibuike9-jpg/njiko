import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { InstallPrompt } from './ui/InstallPrompt';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <InstallPrompt />
  </React.StrictMode>,
);
