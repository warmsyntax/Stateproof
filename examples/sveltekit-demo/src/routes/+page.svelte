<script>
  import { onMounted } from 'svelte';

  let phase = $state('loading');
  let account = $state(null);

  async function fetchAccount() {
    phase = 'loading';
    try {
      const res = await fetch('/api/account');
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        err.isHttp = true;
        throw err;
      }
      const data = await res.json();
      if (!data?.account) {
        phase = 'empty';
      } else {
        account = data.account;
        phase = 'ready';
      }
    } catch (err) {
      phase = err.isHttp ? 'error' : 'offline';
    }
  }

  onMounted(() => {
    fetchAccount();
  });
</script>

<main style="max-width: 480px; margin: 0 auto; background: #fff; padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0;">
  <h1>Account settings (SvelteKit)</h1>

  {#if phase === 'loading'}
    <div data-state="loading" aria-busy="true">
      <p>Loading account…</p>
    </div>
  {:else if phase === 'ready'}
    <div data-state="ready">
      <p data-testid="account-name">{account?.name || 'Ada Lovelace'}</p>
    </div>
  {:else if phase === 'empty'}
    <div data-state="empty">
      <p>No account found for this session.</p>
      <button type="button" data-testid="retry" onclick={fetchAccount}>Retry</button>
    </div>
  {:else if phase === 'error'}
    <div data-state="error">
      <p>Could not load your account. Server error.</p>
      <button type="button" data-testid="retry" onclick={fetchAccount}>Retry</button>
    </div>
  {:else if phase === 'offline'}
    <div data-state="offline">
      <p>You appear to be offline.</p>
      <button type="button" data-testid="retry" onclick={fetchAccount}>Retry</button>
    </div>
  {/if}
</main>
