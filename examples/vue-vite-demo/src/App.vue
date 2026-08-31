<template>
  <main>
    <h1>Account settings (Vue)</h1>

    <div v-if="phase === 'loading'" data-state="loading" aria-busy="true">
      <p>Loading account…</p>
    </div>

    <div v-else-if="phase === 'ready'" data-state="ready">
      <p data-testid="account-name">{{ account?.name || 'Ada Lovelace' }}</p>
    </div>

    <div v-else-if="phase === 'empty'" data-state="empty">
      <p>No account found for this session.</p>
      <button type="button" data-testid="retry" @click="fetchAccount">Retry</button>
    </div>

    <div v-else-if="phase === 'error'" data-state="error">
      <p>Could not load your account. Please try again.</p>
      <button type="button" data-testid="retry" @click="fetchAccount">Retry</button>
    </div>

    <div v-else-if="phase === 'offline'" data-state="offline">
      <p>You appear to be offline.</p>
      <button type="button" data-testid="retry" @click="fetchAccount">Retry</button>
    </div>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue';

const phase = ref('loading');
const account = ref(null);

async function fetchAccount() {
  phase.value = 'loading';
  try {
    const res = await fetch('/api/account');
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.isHttp = true;
      throw err;
    }
    const data = await res.json();
    if (!data?.account) {
      phase.value = 'empty';
    } else {
      account.value = data.account;
      phase.value = 'ready';
    }
  } catch (err) {
    phase.value = err.isHttp ? 'error' : 'offline';
  }
}

onMounted(() => {
  fetchAccount();
});
</script>
