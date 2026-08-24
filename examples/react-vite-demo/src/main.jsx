import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

window.__events = [];
function record(phase) {
  window.__events.push(`${phase}@${Date.now()}`);
}

async function loadAccount() {
  const response = await fetch('/api/account', { method: 'GET' });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.isHttpError = true;
    throw error;
  }
  return response.json();
}

function RetryControl({ onRetry }) {
  return (
    <button type="button" data-testid="retry" className="retry-buggy" onClick={onRetry}>
      Retry
    </button>
  );
}

function App() {
  const [phase, setPhase] = useState('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    record('loading');
    loadAccount()
      .then((payload) => {
        if (!alive) return;
        setPhase(payload.account === null ? 'empty' : 'ready');
      })
      .catch((error) => {
        if (!alive) return;
        record('fetch-failed');
        setPhase(error.isHttpError ? 'error' : 'offline');
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('double')) {
      const timer = setTimeout(() => {
        void loadAccount().catch(() => undefined);
      }, 150);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  useEffect(() => {
    record(`render:${phase}`);
  }, [phase]);

  return (
    <main>
      <h1>Account settings</h1>

      {phase === 'loading' && (
        <div data-state="loading" aria-busy="true">
          <p>Loading account…</p>
        </div>
      )}

      {phase === 'ready' && (
        <div data-state="ready">
          <p data-testid="account-name">Ada Lovelace</p>
        </div>
      )}

      {phase === 'empty' && (
        <div data-state="empty">
          <p>No account found for this session.</p>
          <RetryControl onRetry={() => setAttempt((n) => n + 1)} />
        </div>
      )}

      {phase === 'error' && (
        <div data-state="error">
          <p>Could not load your account. Please try again.</p>
          <RetryControl onRetry={() => setAttempt((n) => n + 1)} />
        </div>
      )}

      {phase === 'offline' && (
        <div data-state="offline">
          <p>You appear to be offline.</p>
          <RetryControl onRetry={() => setAttempt((n) => n + 1)} />
        </div>
      )}
    </main>
  );
}

if (__BEACON_ORIGIN__) {
  const img = document.createElement('img');
  img.setAttribute('data-testid', 'beacon');
  img.addEventListener('load', () => img.setAttribute('data-beacon', 'loaded'));
  img.addEventListener('error', () => img.setAttribute('data-beacon', 'failed'));
  img.src = `${__BEACON_ORIGIN__}/beacon.png`;
  document.body.appendChild(img);
}

createRoot(document.getElementById('root')).render(<App />);
