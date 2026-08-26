# Stateproof — Next Version Improvements & Roadmap (v0.1.4 & Beyond)

This document tracks planned features, architectural enhancements, and optimizations scheduled for **v0.1.4 (Fast-Follow Release)** and **v0.2.0 (Major Milestone)**.

---

## ⚡ v0.1.4 — Performance, Concurrency & Developer Ergonomics

### 1. Parallel Scenario × Viewport Execution (`--workers N`)

**Goal:** Reduce test suite execution time by 3×–5× for medium-to-large scenario suites without introducing concurrency race conditions or breaking deterministic JSON output.

#### Architecture & Design
- **Single Browser Launch, N Isolated Contexts**:
  - Launch **one** shared Playwright `Browser` instance at the start of the run.
  - Workers instantiate isolated `browser.newContext()` instances per `(scenario, viewport)` task.
  - Never parallelize at the browser process level; contexts are lightweight (tens of MBs) vs full browser launches (seconds and hundreds of MBs).
- **Worker Pool & Queue**:
  - Default concurrency: `min(4, os.cpus().length)`.
  - Configurable via `--workers <number>` (or `--workers 1` for deterministic single-threaded debugging).
  - Work queue decomposes the matrix of `scenarios × viewports` into independent queue tasks.
- **Strict Context-Level Interception Isolation**:
  - Interception routing is attached strictly at the `Page` / `BrowserContext` level (via Playwright `page.route` / CDP).
  - Verify that simultaneous requests matching the same `urlPattern` with different scenario mocks across separate contexts execute with 100% isolation and zero cross-talk.
- **Single-Writer Deterministic Aggregation**:
  - Workers collect individual `ScenarioOutcome` results in-memory.
  - Outcomes are **sorted back to exact declaration order** (scenario declaration index, then viewport declaration index) before generating `run.json`, proof cards, or offline HTML reports.
  - Enforces the Stateproof guarantee of deterministic, machine-parseable JSON envelopes regardless of worker completion order.
- **Failure & Crash Isolation**:
  - A crash or failure in one context cleanly marks that specific scenario as failed/error and recycles the worker without aborting unrelated parallel tasks in the pool.

---

### 2. `--watch` Mode for Rapid Local Development Loop

**Goal:** Turn the scenario authoring loop from ~4s to <1s for engineers and autonomous AI agents.

#### Architecture & Design
- **Watcher Target**:
  - Watches `stateproof.scenarios.json`, scenario files matching glob patterns, and referenced `fixtures/**`.
  - Debounce timer: 200ms.
- **Warm Browser Lifecycle**:
  - Keeps a warm browser instance open across file change events.
  - Selectively re-runs only the modified scenario (matched by `scenario.id`).
  - Skips full HTML report generation during watch cycles until manual exit or `--once`.

---

### 3. Screenshot Format & Bandwidth Optimization

**Goal:** Reduce CI artifact payload sizes by 5–10× for large test suites while keeping PNG precision for visual diffs.

#### Architecture & Design
- **`--screenshot-format <png|jpeg>`**:
  - Non-diff runs can opt into `--screenshot-format jpeg` (quality 80) to significantly compress artifact size.
  - PNG remains mandatory and default whenever `--diff` / baseline visual comparison is active.

---

## 🚀 v0.2.0 — Deep Ecosystem & Application Support

### 1. `stateproof discover` Interactive Mode

**Goal:** Eliminate the "time-to-first-PASS" friction for new users and AI agents.

#### Problem
New users running `stateproof init` receive generic scaffolded scenarios (`/api/account`, `[data-state='loading']`) that do not match their actual application routes or DOM selectors, causing initial runs to fail 4/4.

#### Architecture & Design
- Launches the target web application and observes active network traffic.
- Records real HTTP request endpoints, methods, and payload structures.
- Inspects active DOM elements and automatically suggests:
  - Accurate `urlPattern` matching rules.
  - Detected loading skeletons, empty state containers, and retry buttons.
  - Pre-filled `stateproof.scenarios.json` tailored to the live app.

---

### 2. Authenticated Sessions & Header Injection (`storageState` & `extraHeaders`)

**Goal:** Enable seamless state validation for pages behind authentication walls without failing on login redirects.

#### Architecture & Design
- **Schema Additions**:
  ```jsonc
  {
    "auth": {
      "storageState": "fixtures/auth.json", // Playwright storage state (cookies + localStorage)
      "headers": {
        "Authorization": "Bearer ${AUTH_TOKEN}"
      }
    }
  }
  ```
- Inject storage state and custom headers into `browser.newContext({ storageState, extraHTTPHeaders })`.
- Safely integrate with Stateproof's secret scanner to prevent committing sensitive auth tokens into version control.

---

### 3. Dedicated Documentation Site & Starter Framework Templates

- **Standalone Documentation**:
  - Full API & CLI reference, MCP integration tutorials for Cursor, Claude Desktop, Antigravity, and Copilot.
- **Official Example Repositories**:
  - `example-nextjs-app`: Next.js App Router with client state components.
  - `example-vite-react`: React 19 + Tailwind + React Query state proof validation.
  - `example-sveltekit`: SvelteKit edge state validation.
