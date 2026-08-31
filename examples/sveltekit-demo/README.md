# Stateproof SvelteKit Demo (`sveltekit-demo`)

A minimal, deterministic SvelteKit application demonstrating runtime validation of the 4 canonical UI states using Stateproof.

## Running the Demo

1. **Start the App:**
   ```bash
   pnpm --filter @stateproof-dev/example-sveltekit-demo dev
   ```
   (Runs on `http://localhost:5175`)

2. **Run Validation:**
   ```bash
   pnpm stateproof run --file examples/sveltekit-demo/stateproof.scenarios.json
   ```
