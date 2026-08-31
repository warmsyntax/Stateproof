# Stateproof Next.js App Router Demo (`nextjs-app-router-demo`)

A minimal, deterministic Next.js App Router application demonstrating runtime validation of the 4 canonical UI states using Stateproof.

## Running the Demo

1. **Start the Next.js App:**
   ```bash
   pnpm --filter @stateproof-dev/example-nextjs-app-router-demo dev
   ```
   (Runs on `http://localhost:3000`)

2. **Run Validation:**
   ```bash
   pnpm stateproof run --file examples/nextjs-app-router-demo/stateproof.scenarios.json
   ```
