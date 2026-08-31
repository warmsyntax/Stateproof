# Stateproof — Next Version Improvements & Roadmap

This document tracks completed milestones, fast-follow enhancements, and long-term architectural initiatives.

---

## ✅ Shipped in v0.2.0 — Parallel Runner, Zero-Setup Demo & Multi-Framework Support

- **Parallel Scenario × Viewport Worker Pool (`--workers N`)**:
  - Worker pool auto-scaled to `min(4, os.cpus().length)`.
  - Single shared browser launch with isolated `browser.newContext()` instances per `(scenario, viewport)` pair.
  - Context-level CDP route interception with 100% isolation and zero cross-talk.
  - Deterministic single-writer aggregation restoring declaration order before card/envelope generation.
- **Zero-Setup `stateproof demo` Command**:
  - Embedded demo web app bundled inside the CLI.
  - Runs all 4 canonical states (loading, empty, error, offline) in parallel.
  - Generates Markdown card and opens offline HTML report with zero user configuration.
- **Monorepo Version Consolidation**:
  - Centralized single source of truth in `@stateproof-dev/core` (`STATEPROOF_VERSION = '0.2.0'`).
- **Multi-Framework Official Examples**:
  - React + Vite (`examples/react-vite-demo`)
  - Next.js 15 App Router (`examples/nextjs-app-router-demo`)
  - Vue 3 + Vite (`examples/vue-vite-demo`)
  - SvelteKit 2 (`examples/sveltekit-demo`)
- **Self-Test CI Dogfooding**:
  - Automated `.github/workflows/self-test.yml` and per-example CI checks.

---

## ⚡ v0.2.x (Fast-Follow Milestone)

### 1. `--watch` Mode for Rapid Local Development
- Watches `stateproof.scenarios.json` and referenced `fixtures/**` for changes.
- Keeps a warm browser instance open and selectively re-runs only the modified scenario ID.
- Debounce: 200ms.

### 2. `stateproof why <scenario>` Explainability Command
- Reads last failure code (`selector-timeout`, `element-not-hidden`, etc.) and failure screenshot.
- Emits human-readable explanation and remediation steps directly in the terminal.

### 3. Screenshot Format & Bandwidth Optimization
- `--screenshot-format jpeg` (quality 80) for non-diff runs to compress CI artifact payloads by 5–10×.
- Preserves full PNG fidelity whenever `--diff` is active.

---

## 🚀 v2.0 (Major Release Roadmap)

### 1. `stateproof discover` Auto-Inference Engine
- Launches target web application and observes real network traffic and DOM mutation events.
- Automatically generates pre-filled `stateproof.scenarios.json` tailored to the live app.

### 2. Authenticated Sessions & StorageState Injections
- Enables `auth.storageState` (Playwright cookies/localStorage) and `auth.headers` for pages behind login walls.
- Deep integration with Stateproof's secret scanner to prevent committing tokens into version control.

### 3. Cloud Artifact Storage & Shareable PR Evidence (Opt-in)
- Optional Cloudflare R2 / S3 artifact upload for web-shareable PR preview cards.

---

## 🚫 Out of Scope (Strict Anti-Goals)

The following items are strictly rejected to maintain Stateproof's core value proposition:
- SaaS cloud-hosted browser grids.
- Storybook / Component-isolator dual maintenance plugins.
- Real mobile device farms (Appium).
- Custom IDE webview plugins (MCP server covers all AI editors).
- Imperative Cypress/Jest-style test assertion runners.
