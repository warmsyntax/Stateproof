import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Deterministic demo API: GET /api/account returns a populated account by default
// and an empty payload with ?mode=empty. Stateproof intercepts these requests in
// the browser, so the middleware only needs to serve the passthrough cases.
const demoApi = {
  name: 'stateproof-demo-api',
  configureServer(server) {
    server.middlewares.use('/api/account', (req, res) => {
      if (req.method !== 'GET') {
        res.statusCode = 405;
        res.end();
        return;
      }
      const mode = new URL(req.url ?? '/', 'http://localhost').searchParams.get('mode');
      res.setHeader('Content-Type', 'application/json');
      if (mode === 'empty') {
        res.end(JSON.stringify({ account: null }));
      } else {
        res.end(JSON.stringify({ account: { name: 'Ada Lovelace', plan: 'trial' } }));
      }
    });
  },
};

export default defineConfig({
  plugins: [react(), demoApi],
  server: {
    watch: {
      ignored: ['**/stateproof.scenarios.json', '**/fixtures/**', '**/artifacts/**', '**/.lock'],
    },
  },
  define: {
    __BEACON_ORIGIN__: JSON.stringify(process.env.DEMO_BEACON_ORIGIN ?? ''),
    __HIDE_RETRY_ON_MOBILE__: JSON.stringify(process.env.DEMO_HIDE_RETRY_ON_MOBILE === '1'),
  },
});
