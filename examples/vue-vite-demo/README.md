# Stateproof Vue 3 Demo (`vue-vite-demo`)

A minimal, deterministic Vue 3 + Vite application demonstrating runtime validation of the 4 canonical UI states using Stateproof.

## Running the Demo

1. **Start the App:**
   ```bash
   pnpm --filter @stateproof-dev/example-vue-vite-demo dev
   ```
   (Runs on `http://localhost:5174`)

2. **Run Validation:**
   ```bash
   pnpm stateproof run --file examples/vue-vite-demo/stateproof.scenarios.json
   ```
