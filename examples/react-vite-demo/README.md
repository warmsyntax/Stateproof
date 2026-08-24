# Stateproof Demo App (`react-vite-demo`)

A minimal, deterministic React + Vite application demonstrating runtime validation of the 4 canonical UI states using Stateproof:

1. **Loading State**: Simulated with `delay` response mode holding `/api/account` pending.
2. **Empty State**: Simulated with `fixture` response mode serving `{ "account": null }`.
3. **Error State**: Simulated with `error` response mode returning HTTP 500.
4. **Offline State**: Simulated with `offline` response mode aborting requests with `internetdisconnected`.

---

## Running the Demo

### 1. Start the Vite App
```bash
pnpm --filter react-vite-demo dev
```
By default, the demo runs on `http://localhost:5173`.

### 2. Run Stateproof Validation
From the repository root or demo directory:
```bash
# Validate all 4 states across desktop and mobile viewports
pnpm stateproof run --file examples/react-vite-demo/stateproof.scenarios.json
```

### 3. View Artifacts & Reports
After running:
- **Card**: `artifacts/stateproof/account-settings/card.md`
- **Screenshots**: `artifacts/stateproof/account-settings/*.png`
- **Offline HTML Report**: `artifacts/stateproof/account-settings/report/index.html`
