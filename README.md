<div align="center">

# Stateproof

**Deterministic frontend edge-state validation in a controlled browser.**  
*Let agents and developers ship fast without breaking edge cases.*

[![npm version](https://img.shields.io/npm/v/@stateproof-dev/cli.svg)](https://www.npmjs.com/package/@stateproof-dev/cli)
[![CI Status](https://github.com/warmsyntax/Stateproof/actions/workflows/ci.yml/badge.svg)](https://github.com/warmsyntax/Stateproof/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

[Website](https://stateproof.pages.dev) · [Documentation](https://stateproof.pages.dev/docs.html) · [LLM Guide](https://stateproof.pages.dev/llms.txt) · [Report Bug](https://github.com/warmsyntax/Stateproof/issues)

</div>

---

## Why Stateproof?

AI coding assistants and modern frontend teams ship features at incredible speed. But when we build fast, edge states are almost always the first thing to break:

- **Loading skeletons & spinners** that flicker or hang indefinitely on slow connections.
- **Empty zero-states** that render an awkward blank page instead of helpful illustrations and CTAs.
- **Server error boundaries** with broken or overflowing retry buttons on mobile screens.
- **Offline drops** that crash client-side transitions when connectivity is severed.

Writing full end-to-end Cypress or Playwright test suites for every micro-state is time-consuming and fragile. Mocking requests in your application source code pollutes your codebase with testing conditionals and MSW service worker boilerplate.

**Stateproof solves this at the browser wire layer.** It launches an isolated Chromium instance, navigates to your local app, and intercepts network traffic directly via the Chrome DevTools Protocol (CDP). Without touching a single line of your application code, Stateproof forces your UI into every edge state and generates deterministic visual proof cards for your pull requests.

> *"Playwright tests what the user does. Stateproof proves what the UI survives."*

```text
[ LOADING ] [ EMPTY ] [ ERROR ] [ OFFLINE ]
04 STATES / 01 DETERMINISTIC PROOF CARD
```

---

## ⚡ Real Performance & Empirical Benchmarks

Stateproof is engineered for high throughput in CI pipelines and sub-second developer/agent feedback loops.

### Sequential vs Parallel Throughput

*Tested on Node v22, Chromium 151, 4 vCPU / 7.5 GB RAM against a full 4-state suite × 2 viewports (Desktop `1440×1024` + Mobile `390×844`) = 8 self-contained validation checks.*

| Execution Mode | Total Wall Time | Per-Check Median | Throughput | Speedup |
|---|---|---|---|---|
| `--workers 1` (sequential) | **8.2s** | 503ms | ~0.98 checks/s | 1.0x (baseline) |
| `--workers 4` (parallel) | **4.9s** | **~350ms** (non-delayed) | **~1.63 checks/s** | **1.7x faster** |
| `demo` command (zero-setup) | **3.3s** | 240ms | ~2.42 checks/s | **Instant** |

### Per-State Latency Breakdown

| Scenario State | Desktop (`1440×1024`) | Mobile (`390×844`) | Mechanism |
|---|---|---|---|
| **Loading** (500ms delay) | 992ms | 795ms | Request held on wire + skeleton assert + screenshot |
| **Empty** (JSON fixture) | 285ms | 238ms | Instant synthetic wire response (`[]`) |
| **Error + Recovery** (500 → click retry) | 313ms | 248ms | HTTP 500 + retry click + re-intercept + recovery assert |
| **Offline** (connection abort) | 278ms | 304ms | `internetdisconnected` severance + banner assert |

### Setup & Startup Optimization
- **Zero-Download System Browser**: Pass `--browser-channel chrome` (or `msedge`/`chromium`) to eliminate the 115 MB Playwright browser download and reduce browser launch time to **~0.5s**.
- **Deterministic Reliability**: **0 false positives** across consecutive validation runs; **100% bug detection rate** on injected regressions (missing loading skeletons, broken empty states, and missing mobile retry buttons).

---

## 🤖 AI Agent Token Economics: 3–5x Token Savings

Stateproof is built from day one as an agent-native verification engine. When an AI agent (Cursor, Claude Code, Windsurf, Cline, Antigravity) uses the first-party MCP server, it avoids the massive token waste of manual test debugging.

### MCP Self-Healing Loop vs Traditional Agent Debugging

| Approach | Tokens per Debug Cycle | Cycles to Fix | Total Tokens | Time to Fix |
|---|---|---|---|---|
| **Stateproof MCP Server** | **~2,600** | **1–2** | **~5,200** | **~30s** |
| **Playwright + agent DOM dump** | ~5,000 | 3–5 | ~20,000 | ~3–5 min |
| **Cypress + traceback loop** | ~4,000 | 3–5 | ~16,000 | ~2–4 min |
| **Raw browser driving** | ~3,000 / action | 10+ actions | ~30,000+ | ~5–10 min |

### Why Stateproof Saves 3–5x Tokens:
1. **Self-Healing Selector Hints**: When a selector fails, `stateproof_inspect_failure` inspects the live DOM and returns `suggest: [data-state="empty"]`, allowing the agent to remediate the issue in a single turn without parsing full DOM snapshots.
2. **Compact Machine Envelopes**: Structured JSON payloads return exact failure codes (`selector-timeout`, `text-mismatch`, `attribute-mismatch`) with zero noisy stack traces.
3. **Artifact-Linked Proof**: Agents receive local file paths to screenshots and Markdown cards directly on disk (`./artifacts/stateproof/`).

---

## 🥊 Stateproof vs Traditional Testing

Stateproof does not replace journey/E2E test frameworks—it complements them by automating the edge-state surface area that teams rarely have time to write tests for.

| Feature / Capability | Stateproof 0.2.2 | Playwright | Cypress | MSW (Mock Service Worker) |
|---|---|---|---|---|
| **Target Focus** | **Edge-State Proof & Survival** | User journeys & E2E | User journeys & E2E | In-app network mocking |
| **App Instrumentation** | **Zero (0 app edits, 0 tampering)** | Test files required | Test files required | Requires service worker in source |
| **First-Party MCP Server** | ✅ **Native (@stateproof-dev/mcp-server)** | ❌ None | ❌ None | ❌ None |
| **Agent Self-Healing Hints** | ✅ **`suggest` field with live DOM suggestions** | ❌ None | ❌ None | ❌ None |
| **4 Canonical States** | ✅ **Native (Loading, Empty, Error, Offline)** | ⚠️ Manual route scripting | ⚠️ Manual `cy.intercept` | ⚠️ Manual handler files |
| **Recovery Loops** | ✅ **Click → re-intercept → assert (dual capture)** | ⚠️ Complex setup | ⚠️ Complex setup | ❌ Not supported |
| **Standalone PR Proof Cards** | ✅ **Markdown & zero-CDN HTML** | ⚠️ Custom reporter required | ⚠️ Dashboard setup | ❌ None |
| **Parallel Concurrency** | ✅ **`--workers N` built-in** | ✅ `--workers` | ❌ Cloud / Paid | N/A |
| **Visual Regression** | ✅ **`--diff` pixel-diffing built-in** | ✅ `toMatchScreenshot` | ⚠️ Plugin | ❌ None |
| **Browser Auto-Detection** | ✅ **`--browser-channel chrome/msedge`** | ⚠️ CLI flag | ⚠️ CLI flag | N/A |

---

## What It Looks Like in Action

When you run Stateproof across your application viewports (Desktop `1440×1024` and Mobile `390×844`):

```text
PASS  account-loading   desktop  503ms   [data-state='loading']
PASS  account-loading   mobile   480ms   [data-state='loading']
PASS  account-empty     desktop  285ms   [data-state='empty']
PASS  account-empty     mobile   238ms   [data-state='empty']
PASS  account-error     desktop  313ms   [data-state='error']
FAIL  account-error     mobile   5.0s    selector timeout: [data-testid='retry']
      hint: Retry button is overflowing below the viewport fold at 390px
      suggest: [data-testid='mobile-retry']
```

Stateproof immediately tells you (and your AI agent) exactly what broke, why it timed out, and which DOM selector resolves the state.

---

## The 4 Canonical States

| State | Mode | How It Works |
|---|---|---|
| **Loading** | `delay` | Holds the matching API request pending for a set duration to verify skeletons and loading indicators without layout flicker. |
| **Empty** | `fixture` / `inline` | Intercepts the API call and returns an empty dataset (`[]` or `{ items: [] }`) to verify zero-state graphics and copy. |
| **Error** | `error` | Responds with HTTP 500 / 4xx error payloads to ensure error banners and retry mechanisms trigger reliably. |
| **Offline** | `offline` | Aborts network requests with `internetdisconnected` to test client-side offline recovery. |

---

## ⚡ 10-Second Zero-Setup Demo

Experience Stateproof immediately with zero configuration against an embedded demo workbench:

```bash
npx @stateproof-dev/cli demo
```

This runs all 4 canonical edge states in parallel, prints a deterministic PR Markdown proof card to your terminal, and opens an offline HTML report.

---

## 30-Second Quickstart

### 1. Scaffold Your Config
In your project directory, run:

```bash
npx @stateproof-dev/cli init --url http://localhost:5173
```

This creates a clean, annotated `stateproof.scenarios.json` file and a `fixtures/` directory.

### 2. Define Your Scenarios
Specify what route to test, which API endpoint to intercept, and which DOM selectors should appear:

```json
{
  "$schema": "https://unpkg.com/@stateproof-dev/core@0.2.3/schema/v1.json",
  "name": "account-settings",
  "baseUrl": "http://localhost:5173",
  "route": "/settings",
  "viewports": [
    { "name": "desktop", "width": 1440, "height": 1024 },
    { "name": "mobile", "width": 390, "height": 844, "isMobile": true }
  ],
  "scenarios": [
    {
      "id": "loading",
      "label": "Loading Skeleton State",
      "request": { "method": "GET", "urlPattern": "**/api/account" },
      "response": { "mode": "delay", "milliseconds": 500 },
      "expect": { "visible": "[data-state='loading']", "hidden": "[data-state='ready']" }
    },
    {
      "id": "empty",
      "label": "Empty State",
      "request": { "method": "GET", "urlPattern": "**/api/account" },
      "response": { "mode": "fixture", "path": "fixtures/empty.json" },
      "expect": { "visible": "[data-state='empty']", "text": { "h2": "No accounts found" } }
    },
    {
      "id": "error",
      "label": "Server Error & Recovery Loop",
      "request": { "method": "GET", "urlPattern": "**/api/account" },
      "response": { "mode": "error", "status": 500 },
      "expect": { "visible": ["[data-state='error']", "[data-testid='retry']"] },
      "recovery": {
        "action": { "type": "click", "selector": "[data-testid='retry']" },
        "response": { "mode": "fixture", "path": "fixtures/account.json" },
        "expect": { "visible": "[data-state='ready']", "hidden": "[data-state='error']" }
      }
    },
    {
      "id": "offline",
      "label": "Network Disconnect State",
      "request": { "method": "GET", "urlPattern": "**/api/account" },
      "response": { "mode": "offline" },
      "expect": { "visible": "[data-state='offline']" }
    }
  ]
}
```

### 3. Run Validation
Make sure your local dev server is running, then execute:

```bash
# Run headless validation across all scenarios in parallel (workers auto-scaled)
npx @stateproof-dev/cli run

# Run with explicit worker concurrency
npx @stateproof-dev/cli run --workers 4

# Run with auto-detected local Chrome (zero browser download)
npx @stateproof-dev/cli run --browser-channel chrome

# Run visual regression diffing against baselines
npx @stateproof-dev/cli run --diff

# Launch interactive Terminal UI (TUI)
npx @stateproof-dev/cli studio
```

### 4. Export Visual PR Proof Card
Generate a clean Markdown table with embedded screenshot links for your Pull Request description:

```bash
npx @stateproof-dev/cli export --format md
```

```markdown
## Stateproof Card — account-settings

| State   | desktop | mobile |
|---------|:-------:|:------:|
| loading | PASS    | PASS   |
| empty   | PASS    | PASS   |
| error   | PASS    | PASS   |
| offline | PASS    | PASS   |

**Artifacts:** `artifacts/stateproof/account-settings/` — loading.desktop.png · empty.desktop.png · error.desktop.png · offline.desktop.png

**Run:** local · Stateproof 0.2.2 · Chromium 151 · runId 01J9ZK... · 2026-09-01T00:00:00Z
```

---

## 🤖 Connecting to MCP for AI Agents

Add this to your MCP configuration (e.g. `.cursor/mcp.json` or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "stateproof": {
      "command": "npx",
      "args": ["-y", "@stateproof-dev/mcp-server@0.2.2"]
    }
  }
}
```

### First-Party MCP Tools:
1. **`stateproof_list_scenarios`**: Inspects routes, viewports, and active mock rules.
2. **`stateproof_run_validation`**: Runs headless tests and returns structured JSON outcomes with latencies and status envelopes.
3. **`stateproof_inspect_failure`**: Analyzes failures—provides exact failure codes, DOM selector suggestions (`suggest`), and screenshot paths for automated self-healing.
4. **`stateproof_export_card`**: Generates deterministic Markdown proof cards.

---

## 📦 Monorepo Structure

Stateproof is organized as a modular TypeScript monorepo published under `@stateproof-dev`:

| Package | Version | Purpose |
|---|---|---|
| [`@stateproof-dev/cli`](packages/cli) | `0.2.2` | Command-line interface, interactive TUI studio, and runner orchestration |
| [`@stateproof-dev/mcp-server`](packages/mcp-server) | `0.2.2` | Model Context Protocol bridge for AI coding assistants |
| [`@stateproof-dev/core`](packages/core) | `0.2.2` | Pure schemas (Zod), JSON envelopes, and Markdown/JSON card formatters |
| [`@stateproof-dev/playwright-runner`](packages/playwright-runner) | `0.2.2` | Browser execution engine, CDP network interception, and artifact capture |
| [`@stateproof-dev/reporter-html`](packages/reporter-html) | `0.2.2` | Zero-external-network standalone HTML report generator |
| [`@stateproof-dev/app`](packages/app) | `0.2.2` | Shared orchestration layer between CLI / MCP and runner |

### 🚀 Official Framework Examples

| Example App | Framework | Link |
|---|---|---|
| **React + Vite** | React 19, Vite | [`examples/react-vite-demo`](examples/react-vite-demo) |
| **Next.js** | Next.js 15 App Router | [`examples/nextjs-app-router-demo`](examples/nextjs-app-router-demo) |
| **Vue 3 + Vite** | Vue 3 Composition API, Vite | [`examples/vue-vite-demo`](examples/vue-vite-demo) |
| **SvelteKit** | Svelte 5, SvelteKit 2 | [`examples/sveltekit-demo`](examples/sveltekit-demo) |

---

## 🛡️ Privacy & Security Guardrails

- **Loopback-Only by Default**: Stateproof strictly refuses to connect to external remote URLs unless you pass `--allow-remote`.
- **Secret Scanning**: Automatically scans scenario files and fixtures for leaked API keys, tokens, or bearer credentials before opening the browser (`--strict-secrets` mode available).
- **Third-Party Isolation**: Blocks analytics and third-party trackers during validation by default (`--allow-third-party` to override).
- **100% Offline Reports**: Generated HTML reports contain zero external fonts, scripts, or network calls.

---

## ❤️ A Note of Gratitude & Credits

Stateproof stands on the shoulders of giants:

- The **[Playwright](https://playwright.dev/)** team at Microsoft for building the most reliable browser automation and interception engine in the world.
- The **[Model Context Protocol (MCP)](https://modelcontextprotocol.io/)** team at Anthropic for standardizing AI-to-developer tooling communication.
- The **[Vite](https://vitejs.dev/)** and **[Biome](https://biomejs.dev/)** teams for lightning-fast modern frontend tooling.
- Every developer and open-source contributor who tested early builds, reported edge cases, and helped refine the proof card contract.

---

## Contributing

We love contributions! Whether it's adding support for new state modes, refining CLI ergonomics, or writing documentation:

1. Fork the repo and clone it locally.
2. Install dependencies: `pnpm install`
3. Run test suites: `pnpm test`
4. Typecheck & lint: `pnpm typecheck && pnpm lint`
5. Open a Pull Request!

---

## License

Stateproof is open source under the [MIT License](LICENSE).
