<div align="center">

# Stateproof

**Deterministic frontend edge-state validation in a controlled browser.**  
*Let agents and developers ship fast without breaking edge cases.*

[![npm version](https://img.shields.io/npm/v/@stateproof-dev/cli.svg)](https://www.npmjs.com/package/@stateproof-dev/cli)
[![CI Status](https://github.com/warmsyntax/Stateproof/actions/workflows/ci.yml/badge.svg)](https://github.com/warmsyntax/Stateproof/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

[Website](https://stateproof.dev) · [Documentation](docs/) · [LLM Guide](llms.txt) · [Report Bug](https://github.com/warmsyntax/Stateproof/issues)

</div>

---

## Why Stateproof?

AI coding assistants write frontend features at incredible speed. But when we build fast, edge states are almost always the first thing to break:

- **Loading spinners** that hang indefinitely because of an unhandled promise.
- **Empty lists** that render an awkward blank white page instead of a helpful zero-state illustration.
- **Error boundaries** with missing or invisible retry buttons on mobile screens.
- **Offline states** that crash when the device loses network connectivity.

Writing full end-to-end Cypress or Playwright test suites for every micro-state is time-consuming and fragile. Mocking requests in your application source code pollutes your codebase with testing conditionals.

**Stateproof solves this at the browser layer.** It launches an isolated browser, navigates to your local app, and intercepts network traffic directly via Chrome DevTools Protocol (CDP). Without touching a single line of your application code, Stateproof forces your UI into every edge state and generates concrete visual proof cards for your pull requests.

```text
[ LOADING ] [ EMPTY ] [ ERROR ] [ OFFLINE ]
04 STATES / 01 DETERMINISTIC PROOF CARD
```

---

## What It Looks Like in Action

When you run Stateproof across your application viewports (Desktop `1440×1024` and Mobile `390×844`):

```text
PASS  account-loading   desktop  520ms   [data-state='loading']
PASS  account-loading   mobile   480ms   [data-state='loading']
PASS  account-empty     desktop  610ms   [data-state='empty']
PASS  account-empty     mobile   590ms   [data-state='empty']
PASS  account-error     desktop  540ms   [data-state='error']
FAIL  account-error     mobile   5.0s    selector timeout: [data-testid='retry']
      hint: Retry button is overflowing below the viewport fold at 390px
```

Stateproof immediately tells you (and your AI agent) exactly what broke, why it timed out, and which DOM selector failed.

---

## The 4 Canonical States

| State | Mode | How It Works |
|---|---|---|
| **Loading** | `delay` | Holds the matching API request pending for a set duration to verify skeletons and loading indicators without layout flicker. |
| **Empty** | `fixture` / `inline` | Intercepts the API call and returns an empty dataset (`[]` or `{ items: [] }`) to verify zero-state graphics and copy. |
| **Error** | `error` | Responds with HTTP 500 / 4xx error payloads to ensure error banners and retry mechanisms trigger reliably. |
| **Offline** | `offline` | Aborts network requests with `internetdisconnected` to test client-side offline recovery. |

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
  "$schema": "https://unpkg.com/@stateproof-dev/core@0.1.3/schema/v1.json",
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
    }
  ]
}
```

### 3. Run Validation
Make sure your local dev server is running, then execute:

```bash
# Run headless validation across all scenarios and viewports
npx @stateproof-dev/cli run

# Or launch the interactive Terminal UI (TUI)
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

**Artifacts:** `artifacts/stateproof/account-settings/` — loading.desktop.png · empty.desktop.png · error.desktop.png

**Run:** local · Stateproof 0.1.3 · Chromium 141 · runId 01J9ZK... · 2026-08-24T00:00:00Z
```

---

## 🤖 Built for AI Coding Agents (MCP Server)

Stateproof is built from day one as an agent-native verification engine. It includes a first-party **Model Context Protocol (MCP)** server so agents in **Cursor**, **Claude Desktop**, **Windsurf**, **Cline**, and **Antigravity** can validate their own changes without guessing.

### Connecting to MCP

Add this to your MCP configuration (e.g. `.cursor/mcp.json` or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "stateproof": {
      "command": "npx",
      "args": ["-y", "@stateproof-dev/mcp-server"]
    }
  }
}
```

### What Your Agent Can Do:
1. **`stateproof_list_scenarios`**: Inspects routes, viewports, and active mock rules.
2. **`stateproof_run_validation`**: Runs headless tests and returns structured JSON outcomes with latencies.
3. **`stateproof_inspect_failure`**: Analyzes failures—provides exact failure codes, DOM selector suggestions from the live DOM, and failure screenshot paths for automated self-healing.

---

## 📦 Monorepo Structure

Stateproof is organized as a modular TypeScript monorepo published under `@stateproof-dev`:

| Package | Purpose |
|---|---|
| [`@stateproof-dev/cli`](packages/cli) | Command-line interface, interactive TUI, and runner orchestration |
| [`@stateproof-dev/mcp-server`](packages/mcp-server) | Model Context Protocol bridge for AI coding assistants |
| [`@stateproof-dev/core`](packages/core) | Pure schemas (Zod), JSON envelopes, and Markdown/JSON card formatters |
| [`@stateproof-dev/playwright-runner`](packages/playwright-runner) | Browser execution engine, CDP network interception, and artifact capture |
| [`@stateproof-dev/reporter-html`](packages/reporter-html) | Zero-external-network standalone HTML report generator |
| [`@stateproof-dev/app`](packages/app) | Shared orchestration layer between CLI / MCP and runner |

---

## 🛡️ Privacy & Security Guardrails

- **Loopback-Only by Default**: Stateproof strictly refuses to connect to external remote URLs unless you pass `--allow-remote`.
- **Secret Scanning**: Automatically scans scenario files and fixtures for leaked API keys, tokens, or bearer credentials before opening the browser.
- **Third-Party Isolation**: Blocks analytics and third-party trackers during validation by default (`--allow-third-party` to override).
- **100% Offline Reports**: Generated HTML reports contain zero external fonts, scripts, or network calls.

---

## ❤️ A Note of Gratitude & Credits

Stateproof stands on the shoulders of giants. We want to extend our heartfelt thanks to:

- The **[Playwright](https://playwright.dev/)** team at Microsoft for building the most reliable browser automation and interception engine in the world.
- The **[Model Context Protocol (MCP)](https://modelcontextprotocol.io/)** team at Anthropic for opening up a standardized protocol that connects AI coding assistants with developer tools.
- The **[Vite](https://vitejs.dev/)** and **[Biome](https://biomejs.dev/)** teams for making modern frontend tooling incredibly fast and enjoyable to work with.
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
