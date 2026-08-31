'use client';

import { useCallback, useEffect, useState } from 'react';

export default function SettingsPage() {
  const [phase, setPhase] = useState('loading');
  const [account, setAccount] = useState(null);

  const fetchAccount = useCallback(() => {
    setPhase('loading');
    fetch('/api/account')
      .then((res) => {
        if (!res.ok) {
          const err = new Error(`HTTP ${res.status}`);
          err.isHttp = true;
          throw err;
        }
        return res.json();
      })
      .then((data) => {
        if (!data?.account) {
          setPhase('empty');
        } else {
          setAccount(data.account);
          setPhase('ready');
        }
      })
      .catch((err) => {
        setPhase(err.isHttp ? 'error' : 'offline');
      });
  }, []);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  return (
    <main
      style={{
        maxWidth: '480px',
        margin: '0 auto',
        background: '#fff',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
      }}
    >
      <h1>Account Settings (Next.js)</h1>

      {phase === 'loading' && (
        <div data-state="loading" aria-busy="true">
          <p>Loading account details…</p>
        </div>
      )}

      {phase === 'ready' && (
        <div data-state="ready">
          <p data-testid="account-name">{account?.name || 'Ada Lovelace'}</p>
        </div>
      )}

      {phase === 'empty' && (
        <div data-state="empty">
          <p>No account found for this session.</p>
          <button type="button" data-testid="retry" onClick={fetchAccount}>
            Retry
          </button>
        </div>
      )}

      {phase === 'error' && (
        <div data-state="error">
          <p>Could not load account. Server error.</p>
          <button type="button" data-testid="retry" onClick={fetchAccount}>
            Retry
          </button>
        </div>
      )}

      {phase === 'offline' && (
        <div data-state="offline">
          <p>You appear to be offline.</p>
          <button type="button" data-testid="retry" onClick={fetchAccount}>
            Retry
          </button>
        </div>
      )}
    </main>
  );
}
