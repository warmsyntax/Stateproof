# CODING AGENT INSTRUCTION — Stateproof v0.2 Implementation

You are working on the Stateproof repository (github.com/warmsyntax/Stateproof).
This repo is a pnpm monorepo. The user has already verified the CLI and README are real.
Your job: implement the features below. You do NOT have full file access upfront — discover the code first.

---

## PHASE 0 — DISCOVERY (do this first, write a short report)

Run these and report what you find:

1. `pnpm install` at repo root — confirm it builds
2. `pnpm --filter @stateproof-dev/cli --help` — confirm CLI runs
3. `ls packages/*/` — list all packages
4. `cat packages/cli/src/main.ts` — find the existing command registrations
5. `cat packages/playwright-runner/src/run.ts` — find the sequential for-loop (line numbers)
6. `cat packages/core/src/types.ts` — find the Scenario interface
7. `cat packages/core/src/schema.ts` — find the Zod schema
8. `ls examples/` — confirm how many example repos exist
9. `cat examples/react-vite-demo/package.json` — check what's in the demo
10. Check if `examples/react-vite-demo/stateproof.scenarios.json` exists — it does NOT

After discovery, write a 10-line report of what exists, what's missing, and the file paths for the things you'll change.

---

## PHASE 1 — MUST IMPLEMENT (the launch blockers)

Implement exactly these 7 features. Do not deviate.

### 1A. Add `npx @stateproof-dev/cli demo` command

Create `packages/cli/src/commands/demo.ts` that:
- Bundles a static HTML file (or a mini Vite app) inside the CLI package itself
- Runs all 4 canonical states (loading, empty, error, offline) against it
- Opens the generated HTML report in the user's browser
- Prints the markdown card to stdout
- Zero user setup required — no `stateproof.scenarios.json` needed
- Exit code 0 on success, 1 on any failure

Then register it in `packages/cli/src/main.ts` as:
  .command('demo')
  .description('Run a zero-setup demo against a bundled app')
  .action(...)

### 1B. Parallel scenario execution

Edit `packages/playwright-runner/src/run.ts`:
- Replace the sequential `for` loop with a worker pool
- One shared `Browser` instance, one `browser.newContext()` per (scenario, viewport) pair
- Default concurrency: `min(4, os.cpus().length)`
- Add `--workers N` CLI flag to `stateproof run`
- After all contexts finish, sort outcomes back to declaration order (scenario index, then viewport index) before writing artifacts
- Each context must have isolated route handling — no cross-talk between parallel scenarios

### 1C. Fix the broken example

The `examples/react-vite-demo/` directory is missing files. Create:
- `examples/react-vite-demo/stateproof.scenarios.json` with 4 scenarios (loading, empty, error, offline) pointing to `**/api/account`
- `examples/react-vite-demo/fixtures/account-empty.json` — `{}` (empty account)
- `examples/react-vite-demo/fixtures/account-ready.json` — `{ account: { name: "Ada Lovelace" } }`
- Update `examples/react-vite-demo/README.md` to reference the new files correctly
- The demo's `src/main.jsx` already has the 4 states mapped to `[data-state='loading'|'empty'|'ready'|'error'|'offline']`

### 1D. Add 3 more example repos

Create these three directories with working examples:

- `examples/nextjs-app-router-demo/` — Next.js App Router, a `/settings` page with fetch to `/api/account`
- `examples/sveltekit-demo/` — SvelteKit, same pattern
- `examples/vue-vite-demo/` — Vue 3 + Vite, same pattern

Each must have:
- `package.json` with the framework deps
- `src/` with a component that fetches `/api/account` and renders loading/empty/error/offline states
- `stateproof.scenarios.json` with all 4 states
- `fixtures/account-empty.json` and `fixtures/account-ready.json`
- `README.md` with setup and run instructions
- A passing `pnpm run stateproof-run` script

### 1E. Self-test — Stateproof runs against itself

- Add `.github/workflows/self-test.yml` — runs on every PR:
  - Installs dependencies
  - Builds all packages
  - Runs `npx @stateproof-dev/cli run` against `examples/react-vite-demo`
  - Runs the same against `landing-site/` if it has a scenarios file
  - Uploads artifacts on failure
- Add `landing-site/stateproof.scenarios.json` if it doesn't exist

### 1F. CI in every example repo

For each example repo, add `.github/workflows/stateproof.yml`:
- Runs on PR
- Installs deps, builds, runs stateproof
- Posts the markdown card as a PR comment
- Fails the PR if any scenario fails

### 1G. Version consolidation

Create `packages/core/src/version.ts`:
  export const STATEPROOF_VERSION = '0.2.0';

Update all hardcoded `'0.1.3'` strings in:
- `packages/cli/src/main.ts`
- `packages/mcp-server/src/server.ts`
- `packages/app/src/run.ts` (default stateproofVersion)
to import from `@stateproof-dev/core`

---

## PHASE 2 — SHOULD IMPLEMENT (v0.2 features)

These are next-version features that strengthen the launch.

### 2A. `stateproof discover` command

New file: `packages/cli/src/commands/discover.ts`
- Accepts `--url <baseUrl>`
- Launches a browser, navigates to the URL
- Records all network requests (method, URL pattern)
- Uses `packages/playwright-runner/src/analyzer.ts` `analyzeDomForSelectors` to detect loading/error/empty selectors
- Generates and writes a `stateproof.scenarios.json` to cwd
- Prints a summary of what it detected

Register in `main.ts`.

### 2B. `--watch` mode for `stateproof run`

- Watches `stateproof.scenarios.json` and `fixtures/` for changes
- Re-runs only the changed scenario
- Keeps browser warm between runs
- Debounce: 200ms
- Add to `packages/cli/src/commands/run.ts`

### 2C. Auth support in scenario schema

Edit `packages/core/src/types.ts` and `packages/core/src/schema.ts`:
- Add optional `auth` field to `Scenario`:
  ```
  auth: {
    storageState?: string  // path to Playwright storageState JSON
    headers?: Record<string, string>
  }
  ```
- In `packages/playwright-runner/src/run.ts`, when creating the context:
  - If `scenario.auth.storageState` exists, pass it to `browser.newContext({ storageState })`
  - If `scenario.auth.headers` exists, inject as `extraHTTPHeaders`
- Integrate with the existing secret scanner to warn if auth tokens are in committed files

### 2D. `stateproof why <scenario>` command

New file: `packages/cli/src/commands/why.ts`
- Accepts a scenario ID
- Reads the last run artifacts from `artifacts/stateproof/<name>/`
- Reads the failure code from the JSON
- Prints a human-readable explanation of what failed and how to fix it

Register in `main.ts`.

### 2E. Screenshot format flag

- Add `--screenshot-format png|jpeg` to `stateproof run`
- Default: `png` (required for `--diff`)
- When `--screenshot-format jpeg` and no `--diff`: save as JPEG quality 80
- Update the HTML report to reference the right file extension

---

## PHASE 3 — DO NOT IMPLEMENT (out of scope)

Do NOT touch these. Not now, not this session:
- SaaS dashboard
- Storybook integration
- VS Code extension
- Cloud browser hosting
- Mobile testing (Appium)
- AI-generated scenarios from PR diffs
- Cypress/Playwright Test compat layers
- Any new page/route in the landing site

---

## RULES

1. Write tests for every new command in the same package (`*.test.ts` next to the source).
2. Run `pnpm test` before marking any step complete.
3. Run `pnpm typecheck` at the end. Zero errors.
4. Run `pnpm lint` at the end. Zero errors.
5. Do not change the public API surface of any package in a way that breaks existing consumers.
6. Commit messages must follow the conventional commits format: `feat(scope): description` or `fix(scope): description`.
7. Create a separate PR per feature or PR group — do not bundle everything into one PR.
8. After all PRs are merged, bump the version across the monorepo to `0.2.0` and create a git tag `v0.2.0`.
9. Update the README to remove any claim that's now stale and add links to the new example repos.

## REPORT

When you finish, write a short report:
- Which items from PHASE 1 are complete and working
- Which items from PHASE 2 are complete and working
- Which items from PHASE 2 you did NOT do and why
- Commands to verify each feature works
- Any bugs or blockers you hit
