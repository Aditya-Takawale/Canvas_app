import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { store } from './store';
import './index.css';
import log from './utils/logger';

// Optionally silence noisy prototype console logs for production to reduce overhead
if (process.env.NODE_ENV === 'production') {
  // Example: Could wrap or throttle high-frequency debug logs from canvas modules later
  log.info('Frontend logging initialized at level:', log.level);
} else {
  log.debug('Development mode logging active (level =', log.level, ')');
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  // <React.StrictMode> - TEMPORARILY DISABLED TO TEST DRAWING ISSUE
    <Provider store={store}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <App />
      </BrowserRouter>
    </Provider>
  // </React.StrictMode>
);