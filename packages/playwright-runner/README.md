# `@stateproof-dev/playwright-runner`

> Headless browser execution engine, catch-all network interception, and viewport capture for Stateproof.

---

## Features

- **Catch-All Interception**: Single catch-all route handler registered before navigation ensuring zero unresolved routes or hung browser requests.
- **Interception Modes**:
  - `delay`: Holds matched requests unresolved while capturing loading UI, then aborts with `aborted`.
  - `fixture`: Fulfills requests with local fixture files and automatic `Content-Type` detection.
  - `inline`: Fulfills requests with inline JSON objects.
  - `error`: Fulfills requests with simulated HTTP 4xx/5xx status codes.
  - `offline`: Aborts requests with `internetdisconnected` at the network level.
- **Selector Waiting & Stability**: Waits for all required selectors to become visible with continuous stability checks.
- **Artifact Locking**: Prevents concurrent execution collisions via `.lock` file acquisition.

---

## Installation

```bash
npm install @stateproof-dev/playwright-runner
# or
pnpm add @stateproof-dev/playwright-runner
```

---

## Usage

```ts
import { runScenarios } from '@stateproof-dev/playwright-runner';

const result = await runScenarios({
  file: scenarioFile,
  scenarioFilePath: 'stateproof.scenarios.json',
  baseUrl: 'http://localhost:5173',
  stateproofVersion: '0.1.3',
});
```
