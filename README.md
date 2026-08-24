# Stateproof

> **Frontend Runtime Validation for AI Coding Agents & Engineers.**  
> *Let agents build fast. Prove the UI survives real states.*

```text
[ LOADING ] [ EMPTY ] [ ERROR ] [ OFFLINE ]
04 STATES / 01 PROOF CARD
```

---

## What is Stateproof?

AI coding agents write frontend code at superhuman speeds, but they routinely break critical edge states: spinners that never stop, empty lists that render blank screens, error branches missing retry buttons, and layout shifts on mobile viewports.

**Stateproof** provides deterministic runtime proof for your UI. By intercepting browser network traffic at the Playwright layer, Stateproof forces your local web application into all 4 canonical states without modifying application code or writing complex end-to-end tests.

```text
PASS  account-loading  desktop  520ms   [data-state='loading']
PASS  account-loading  mobile   480ms   [data-state='loading']
PASS  account-empty    desktop  610ms   [data-state='empty']
PASS  account-empty    mobile   590ms   [data-state='empty']
PASS  account-error    desktop  540ms   [data-state='error']
FAIL  account-error    mobile   8.0s    selector timeout: [data-testid='retry']
      hint: render a retry control below 420px
```

---

## The 4 Canonical States

| State | Interception Mode | Behavior |
|---|---|---|
| **Loading** | `delay` | Holds the matching request unresolved while capturing the loading skeleton/spinner. |
| **Empty** | `fixture` / `inline` | Fulfills the request with an empty dataset (`[]` or `{ items: [] }`). |
| **Error** | `error` | Fulfills the request with HTTP 500 / 4xx and validates the error message & retry controls. |
| **Offline** | `offline` | Aborts matching requests with `internetdisconnected` at the network layer. |

---

## Quickstart

### 1. Initialize Stateproof
Scaffold a `stateproof.scenarios.json` file and fixtures directory in your project:

```bash
npx stateproof init --url http://localhost:5173
```

### 2. Define Scenarios
Edit `stateproof.scenarios.json` to define your target routes and expected DOM selectors:

```json
{
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
      "request": { "method": "GET", "urlPattern": "**/api/account" },
      "response": { "mode": "delay", "milliseconds": 500 },
      "expect": { "visible": "[data-state='loading']" }
    },
    {
      "id": "empty",
      "request": { "method": "GET", "urlPattern": "**/api/account" },
      "response": { "mode": "fixture", "path": "fixtures/empty.json" },
      "expect": { "visible": "[data-state='empty']" }
    },
    {
      "id": "error",
      "request": { "method": "GET", "urlPattern": "**/api/account" },
      "response": { "mode": "error", "status": 500 },
      "expect": { "visible": ["[data-state='error']", "[data-testid='retry']"] }
    }
  ]
}
```

### 3. Run Validation
```bash
npx stateproof run
```

### 4. Export the Stateproof Card
Export Markdown evidence ready to paste directly into GitHub Pull Request descriptions:

```bash
npx stateproof export --format md
```

```markdown
## Stateproof Card — account-settings

| State   | desktop | mobile |
|---------|:-------:|:------:|
| loading | PASS    | PASS   |
| empty   | PASS    | PASS   |
| error   | PASS    | PASS   |

**Artifacts:** `artifacts/stateproof/account-settings/` — loading.desktop.png · loading.mobile.png · empty.desktop.png · empty.mobile.png · error.desktop.png · error.mobile.png

**Run:** local · Stateproof 0.1.0 · Chromium 141 · runId 01J9ZK... · 2026-08-24T00:00:00Z
```

---

## Monorepo Packages

```text
stateproof/
├── packages/
│   ├── core/               # @stateproof-dev/core             — pure schema, validation, cards
│   ├── playwright-runner/  # @stateproof-dev/playwright-runner — browser execution & interceptor
│   ├── cli/                # @stateproof-dev/cli              — CLI (init, run, list, export)
│   ├── reporter-html/      # @stateproof-dev/reporter-html    — standalone offline HTML report
│   ├── app/                # @stateproof-dev/app              — shared orchestration
│   └── mcp-server/         # @stateproof-dev/mcp-server       — AI agent MCP bridge
└── examples/
    └── react-vite-demo/    # Reference 4-state React + Vite demo application
```

---

## Security & Guardrails

- **Loopback-Only by Default**: Stateproof strictly refuses to connect to remote/production servers without the explicit `--allow-remote` flag.
- **Strict Secret Scanning**: Scans scenario definitions and responses for hardcoded API keys, bearer tokens, and credentials before browser execution.
- **Offline HTML Reports**: `report/index.html` operates with zero external network requests, zero `<script>` tags, and 100% dynamic HTML escaping.
- **Third-Party Isolation**: Third-party tracking and analytics requests are blocked by default unless `--allow-third-party` is passed.

---

## License

MIT © [Stateproof](https://github.com/stateproof/stateproof)
