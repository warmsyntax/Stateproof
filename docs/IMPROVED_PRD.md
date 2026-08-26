# Stateproof — Improved PRD 02

**Production-Ready v0.2+ Evolution: Terminal Studio, Agent Integration, Visual Diff, and Verification**

| Field | Value |
|---|---|
| Status | Draft for review |
| Scope | Stateproof v0.2+ after v0.1 ships |
| Governing docs | `contract.md`, `architecture.md`, `implementation-plan.md`, `rules.md`, `design.md` |
| Supersedes | `IMPROVED_PRD.md` for v0.2+ planning |
| Core rule | v0.2 features must not break the v0.1 CLI contract, JSON envelope, exit-code model, artifact layout, or privacy rules without an explicit contract change. |

---

## 1. Executive Summary

Stateproof v0.1 proves the core engine:

- Strict JSON scenario validation.
- Headless Chromium request interception.
- Modes: `delay`, `fixture`, `inline`, `error`, `offline`.
- PASS / FAIL / ERROR result model.
- Markdown and JSON cards.
- Offline HTML report.
- Secret scanning.
- Loopback and third-party guardrails.
- Deterministic machine envelope for agents.

Stateproof v0.2 evolves the product into a **terminal-first runtime proof studio** while preserving the machine contract.

The v0.2 pillars are:

1. **Interactive Terminal Studio**
   - Human-only TUI.
   - Route/request inspection.
   - Four-state switchboard.
   - Save scenarios without hand-editing JSON.

2. **Smart Selector Analyzer**
   - Advisory selector detection.
   - Loading, empty, error, retry, alert, skeleton heuristics.
   - Never invents API responses.
   - Never silently rewrites user assertions.

3. **Visual Baseline Regression**
   - Baseline screenshots.
   - Pixel diff.
   - Configurable threshold.
   - Static offline diff evidence.

4. **Native MCP Bridge**
   - First-class AI-agent integration.
   - Tools for listing, running, inspecting failures, and exporting cards.
   - No shell scraping required.

The product remains:

- Local-first.
- Privacy-first.
- No telemetry.
- No external network calls except the configured `baseUrl` inside the controlled browser.
- Deterministic for CI and coding agents.
- Offline-report friendly.
- PASS / FAIL / ERROR only in v0.1 and v0.2 unless contract changes.

---

## 2. Non-Negotiable Product Rules

Every v0.2 feature must obey the following rules.

### 2.1 Privacy and network rules

| Rule | Requirement |
|---|---|
| No telemetry | Stateproof never sends analytics, crash reports, usage events, or DOM content to external services. |
| No external network in reports | HTML reports must work from `file://` with zero network requests. |
| Local app only by default | Non-loopback URLs require `--allow-remote`. |
| Third-party blocking | Requests not matching the `baseUrl` origin are blocked unless `--allow-third-party` is passed. |
| No app modification | Stateproof never modifies the user's app code, dev server, hosts file, system proxy, or production API. |
| Interception only in controlled browser | All request simulation happens inside Playwright route interception in contexts Stateproof owns. |

### 2.2 Agent and CI rules

| Rule | Requirement |
|---|---|
| No prompts in programmatic mode | If stdout is not a TTY, or `CI=true`, or `--reporter json` is used, no interactive prompt may appear. |
| One JSON document | With `--reporter json`, stdout contains exactly one JSON document. |
| Diagnostics on stderr | Logs, hints, warnings, and debug info go to stderr. |
| Stable envelope | `ok`, `schemaVersion`, `type`, `data`, `error` remain stable. |
| Exit codes are semantic | Agents must be able to branch on exit codes without parsing human text. |
| No spinners when piped | Never emit spinners, ANSI cursor movement, or alt-screen escape codes into piped output. |
| NO_COLOR respected | If `NO_COLOR` is set, disable color output. |

### 2.3 Status language rules

| Rule | Requirement |
|---|---|
| v0.2 statuses | Continue emitting only `PASS`, `FAIL`, `ERROR` unless contract explicitly changes. |
| Reserved statuses | `WARN` and `SKIP` remain reserved and are not emitted by default. |
| Honest language | Never say “fully tested”, “bug-free”, or “guaranteed”. Use “captured”, “asserted”, “passed”, “failed”. |
| Evidence, not promises | Screenshots and structured results are the proof. |

---

## 3. Required Contract Changes Before v0.2 Implementation

The current v0.1 contract is frozen. The following v0.2 features require contract updates before implementation.

| Change | Reason |
|---|---|
| Add `studio` command | v0.1 has only `init`, `run`, `list`, `export`. |
| Add TTY error code | Example: `INTERACTIVE_TTY_REQUIRED` when `studio` is invoked in CI/non-TTY. |
| Add visual diff flags | Examples: `--update-baselines`, `--diff`, `--baseline-dir`, `--diff-threshold`. |
| Add visual diff failure code | Example: `visual-diff-exceeded`. |
| Define baseline storage layout | Baselines may need to be committed, so they should not live only under ignored `artifacts/`. |
| Add selector suggestion output shape | If suggestions are machine-readable, envelope must define where they appear. |
| Add MCP package boundary | MCP server must not violate the rule that nothing depends on `@stateproof/cli`. |
| Add new runtime dependencies | v0.1 dependency set is frozen. New deps require contract change and justification. |

Recommended new contract values:

```text
Command:
  studio

Machine error codes:
  INTERACTIVE_TTY_REQUIRED
  BASELINE_MISSING
  BASELINE_WRITE_FAILED
  VISUAL_DIFF_FAILED
  MCP_SERVER_INVALID_PROJECT_ROOT
  SELECTOR_SUGGESTION_UNAVAILABLE

FailureCode:
  visual-diff-exceeded

Envelope types:
  studio.result
  mcp.tools.list
  mcp.tool.result
```

Do not implement these until `contract.md` is updated.

---

## 4. Execution Modes

Stateproof must support three execution modes.

### 4.1 Human interactive mode

Used when:

```text
process.stdin.isTTY === true
process.stdout.isTTY === true
CI is not set
--reporter json is not active
command is studio or another interactive command
```

Behavior:

- Rich terminal UI may launch.
- Keyboard navigation allowed.
- Human-readable output may use color.
- Must respect `NO_COLOR`.
- Must restore terminal state on exit.
- Must not corrupt scrollback.
- Prefer line-based rendering over full-screen alternate screen by default.

### 4.2 CI mode

Used when:

```text
CI=true
or stdout is not a TTY
or stdin is not a TTY
or output is piped
```

Behavior:

- TUI must never launch.
- No prompts.
- No spinners.
- No cursor animation.
- `--reporter json` emits one JSON document.
- Human reporter emits plain, parseable text.
- Exit codes are the primary machine signal.

### 4.3 Agent mode

Used by coding agents such as:

- Claude Code.
- Cursor.
- OpenCode.
- Kilo.
- GitHub Copilot coding agents.
- Custom MCP clients.

Behavior:

- Prefer `--reporter json` or MCP.
- Never use interactive TUI.
- Read stdout JSON envelope.
- Branch on exit code.
- Use failure `hint` fields to decide next action.
- Use MCP tools if the client supports MCP.
- Use shell commands if the client only has terminal access.

---

## 5. What to Use: Package and Dependency Plan

### 5.1 Existing v0.1 packages

| Package | Responsibility |
|---|---|
| `@stateproof/core` | Schema, matcher, result model, exit codes, card rendering, validation. Pure. No Playwright. No TUI. |
| `@stateproof/playwright-runner` | Browser lifecycle, interception, selector waits, screenshots, failure capture. |
| `@stateproof/cli` | Commander commands, flags, stdout/stderr discipline, guardrails, human output. |
| `@stateproof/reporter-html` | Offline HTML report. No inline JavaScript. No external assets. |
| `examples/react-vite-demo` | Deterministic demo app and E2E fixture. |

### 5.2 Proposed v0.2 packages or internal modules

| Package / module | Responsibility | Notes |
|---|---|---|
| `@stateproof/tui` or `packages/cli/src/tui` | Terminal Studio UI | Keep lightweight. Do not put in core. |
| `@stateproof/mcp-server` | MCP bridge | Must not depend on CLI internals. |
| `@stateproof/app` or `@stateproof/service` | Shared run/list/export orchestration | Recommended so CLI and MCP can reuse logic without MCP depending on CLI. |
| `@stateproof/visual-diff` or runner submodule | Baseline comparison | Should be optional and isolated. |

### 5.3 Existing frozen v0.1 runtime dependencies

These are already allowed by contract v0.1:

```text
commander
zod
picocolors
playwright
picomatch
jsonc-parser
```

### 5.4 Proposed v0.2 dependencies

These require an explicit contract change before use.

| Dependency | Purpose | Justification |
|---|---|---|
| `@clack/prompts` | Lightweight terminal prompts | Small, TTY-safe, better than hand-rolled raw-mode prompts. |
| `pixelmatch` | Pixel diff | Small, focused, widely used. |
| `pngjs` | PNG decoding/encoding | Needed by `pixelmatch`. |
| `@modelcontextprotocol/sdk` | MCP server | Official/standard SDK for MCP transport and tool schema. |

Rules for new dependencies:

- No new dependency may be added in a feature PR without updating `contract.md`.
- Core must remain free of Playwright, TUI, and MCP dependencies.
- TUI must not leak into reporter-html.
- MCP server must not import CLI internals unless architecture is changed.
- Prefer optional peer dependencies or separate packages for heavy features.

---

## 6. How to Execute Stateproof

This section defines the exact execution instructions for contributors, users, agents, and CI.

### 6.1 Contributor setup from a fresh clone

Prerequisites:

- Node.js >= 20.
- pnpm.
- Git.
- OS: Ubuntu Linux or Windows. macOS should work but is not the primary CI target.

Commands:

```bash
git clone <repository-url>
cd stateproof
pnpm install
pnpm -r build
pnpm lint
pnpm typecheck
pnpm test
pnpm exec playwright install chromium
```

Expected result:

- Build succeeds.
- Lint succeeds.
- Typecheck succeeds.
- Unit and integration tests succeed.
- Chromium is installed for Playwright.

### 6.2 Running the golden-path demo locally

Terminal 1:

```bash
pnpm --filter react-vite-demo dev
```

Terminal 2:

```bash
stateproof init \
  --url http://localhost:5173 \
  --route /account/settings

stateproof run \
  --file stateproof.scenarios.json \
  --reporter human
```

If running from the monorepo before publishing, use one of:

```bash
pnpm stateproof run --file stateproof.scenarios.json --reporter json
```

or:

```bash
node packages/cli/dist/index.js run --file stateproof.scenarios.json --reporter json
```

### 6.3 Published user installation

Once published, users should be able to install locally:

```bash
npm install -D @stateproof/cli
pnpm exec playwright install chromium
```

Then run:

```bash
npx stateproof init --url http://localhost:3000 --route /settings
npx stateproof run --reporter json
```

Or with pnpm:

```bash
pnpm add -D @stateproof/cli
pnpm exec playwright install chromium
pnpm stateproof init --url http://localhost:3000 --route /settings
pnpm stateproof run --reporter json
```

### 6.4 v0.2 Terminal Studio execution

Proposed command:

```bash
stateproof studio
```

Optional flags:

```bash
stateproof studio \
  --file stateproof.scenarios.json \
  --url http://localhost:5173 \
  --route /account/settings
```

TTY guardrail:

```ts
const canUseStudio =
  process.stdin.isTTY === true &&
  process.stdout.isTTY === true &&
  process.env.CI !== "true" &&
  reporter !== "json";
```

If `studio` is invoked in CI or piped mode:

- Do not launch TUI.
- Exit with code `2`.
- Emit machine error:

```json
{
  "ok": false,
  "schemaVersion": 1,
  "type": "error",
  "data": null,
  "error": {
    "code": "INTERACTIVE_TTY_REQUIRED",
    "message": "stateproof studio requires an interactive terminal.",
    "hint": "Use `stateproof run --reporter json` in CI or coding-agent environments."
  }
}
```

### 6.5 v0.2 visual diff execution

Proposed commands:

Create or update baselines:

```bash
stateproof run --update-baselines
```

Run comparison:

```bash
stateproof run --diff
```

With explicit threshold:

```bash
stateproof run --diff --diff-threshold 0.1
```

With explicit baseline directory:

```bash
stateproof run --diff --baseline-dir stateproof/baselines
```

Recommended default baseline location:

```text
stateproof/baselines/<scenario-file-name>/
```

Diff artifacts should still be written under:

```text
artifacts/stateproof/<name>/
```

Example artifacts:

```text
account-settings.account-loading.desktop.png
account-settings.account-loading.desktop.baseline.png
account-settings.account-loading.desktop.current.png
account-settings.account-loading.desktop.diff.png
```

---

## 7. Connection Model

Stateproof has five connection boundaries.

### 7.1 Stateproof to local app

| Property | Rule |
|---|---|
| Target | `baseUrl` from scenario file or `--url`. |
| Default restriction | Loopback only. |
| Allowed loopback hosts | `127.0.0.1`, `::1`, `[::1]`, `localhost`. |
| Hostname resolution | Non-IP hostnames must resolve only to loopback addresses. |
| Remote escape hatch | `--allow-remote`. |
| Redirect guard | Main-frame redirect to non-loopback origin fails unless `--allow-remote`. |
| Reachability | `run` checks reachability with a 10-second budget. |
| Failure | `APP_UNREACHABLE`, exit code `3`. |

### 7.2 Stateproof to browser

| Property | Rule |
|---|---|
| Browser | Chromium via Playwright. |
| Mode | Headless by default in v0.1/v0.2. |
| Launch | One browser launch per `run`. |
| Context | Fresh context per scenario × viewport. |
| Service workers | Blocked. |
| Locale | `en-US`. |
| Timezone | `UTC`. |
| HTTPS errors | Ignored only for HTTPS loopback. |
| Missing browser | `BROWSER_MISSING`, exit code `3`. |

### 7.3 Stateproof to filesystem

| Property | Rule |
|---|---|
| Main artifact root | `artifacts/stateproof/` |
| Lockfile | `.lock` acquired during run. |
| Concurrent runs | Forbidden per artifact directory. |
| Report | `report/index.html` + `report/assets/*.png`. |
| Init files | `stateproof.scenarios.json`, `fixtures/`, `.gitignore` entry. |
| Baselines | Proposed v0.2 directory outside `artifacts/` if they should be committed. |
| No hidden writes | Stateproof must not write outside allowed locations without explicit user action. |

### 7.4 Stateproof to coding agents

Two supported integration paths:

1. **CLI + JSON envelope**
   - Works everywhere.
   - Uses shell execution.
   - Best for agents with terminal access.

2. **MCP server**
   - Works in MCP-compatible clients.
   - Structured tools.
   - No stdout scraping.
   - Best for Claude Code, Cursor, OpenCode, Kilo, and other MCP clients.

### 7.5 Stateproof to network

| Network target | Allowed? |
|---|---|
| Configured `baseUrl` inside controlled browser | Yes |
| Third-party origins inside controlled browser | No by default; yes only with `--allow-third-party`. |
| Telemetry | Never |
| Crash reporting | Never |
| Update checking | Never by default |
| Font loading in report | Never |
| External CSS/JS in report | Never |
| MCP transport | Local stdio by default; no remote HTTP unless explicitly designed later. |

---

## 8. Coding Agent Compatibility

Stateproof must be usable by coding agents in two ways:

1. Shell tool using CLI JSON output.
2. MCP tool server.

### 8.1 CLI JSON integration

Agents should use:

```bash
stateproof run --reporter json
```

Expected stdout:

```json
{
  "ok": false,
  "schemaVersion": 1,
  "type": "run.result",
  "data": {
    "schemaVersion": 1,
    "runId": "01J9ZK...",
    "stateproofVersion": "0.2.0",
    "browserVersion": "Chromium 141",
    "startedAt": "2026-08-23T14:02:15Z",
    "finishedAt": "2026-08-23T14:02:23Z",
    "baseUrl": "http://localhost:5173",
    "file": "stateproof.scenarios.json",
    "scenarios": []
  },
  "error": null
}
```

Agent decision rules:

| Exit code | Meaning | Agent action |
|---|---|---|
| `0` | All scenarios passed | Continue, attach card, mark proof complete. |
| `1` | One or more scenario failures | Read failures, modify UI/code, rerun. |
| `2` | Usage/config error | Do not retry blindly. Read `error.hint`. |
| `3` | Environment error | Start app, install browser, then retry. |
| `4` | Internal error | Report bug, include `runId`, read `trace.md` if present. |

Useful agent parse example:

```bash
stateproof run --reporter json > stateproof-result.json
```

Then inspect:

```bash
jq '.data.scenarios[] | {id, viewport: .viewport.name, status, failureCode, hint}' stateproof-result.json
```

### 8.2 MCP server tools

The MCP server must expose only named, bounded operations. It must not expose arbitrary shell execution or arbitrary network interception.

Recommended tools:

#### `stateproof_list_scenarios`

Purpose:

```text
List scenario file metadata, scenarios, viewports, and validation state.
```

Input schema:

```json
{
  "type": "object",
  "properties": {
    "file": {
      "type": "string",
      "description": "Path to scenario file. Defaults to stateproof.scenarios.json."
    }
  },
  "additionalProperties": false
}
```

Output:

```json
{
  "ok": true,
  "schemaVersion": 1,
  "type": "list.result",
  "data": {
    "file": "stateproof.scenarios.json",
    "name": "account-settings",
    "baseUrl": "http://localhost:5173",
    "route": "/account/settings",
    "viewports": [],
    "scenarios": []
  },
  "error": null
}
```

#### `stateproof_run`

Purpose:

```text
Run selected scenarios or all scenarios.
```

Input schema:

```json
{
  "type": "object",
  "properties": {
    "file": { "type": "string" },
    "url": { "type": "string" },
    "scenarios": {
      "type": "array",
      "items": { "type": "string" }
    },
    "viewports": {
      "type": "array",
      "items": { "type": "string" }
    },
    "timeoutMs": { "type": "number" },
    "allowRemote": { "type": "boolean" },
    "allowThirdParty": { "type": "boolean" },
    "strictSecrets": { "type": "boolean" }
  },
  "additionalProperties": false
}
```

Output:

```json
{
  "ok": false,
  "schemaVersion": 1,
  "type": "run.result",
  "data": {},
  "error": null
}
```

#### `stateproof_inspect_failure`

Purpose:

```text
Get failure details for a scenario and viewport from a completed run.
```

Input schema:

```json
{
  "type": "object",
  "properties": {
    "run": {
      "type": "string",
      "description": "Artifact directory or runId."
    },
    "scenario": {
      "type": "string"
    },
    "viewport": {
      "type": "string"
    }
  },
  "required": ["run"],
  "additionalProperties": false
}
```

Output should include:

```json
{
  "ok": true,
  "schemaVersion": 1,
  "type": "inspect.result",
  "data": {
    "scenarioId": "account-error",
    "viewport": "mobile",
    "status": "failed",
    "failureCode": "selector-timeout",
    "message": "Expected selector [data-state='error'] was not visible within 15000ms.",
    "hint": "Render a visible error state when /api/account returns HTTP 500.",
    "screenshot": "artifacts/stateproof/account-settings/account-error.mobile.png",
    "selector": "[data-state='error']",
    "timeoutMs": 15000
  },
  "error": null
}
```

#### `stateproof_export_card`

Purpose:

```text
Export Markdown or JSON card from an artifact directory.
```

Input schema:

```json
{
  "type": "object",
  "properties": {
    "run": { "type": "string" },
    "format": {
      "type": "string",
      "enum": ["md", "json"],
      "default": "md"
    }
  },
  "required": ["run"],
  "additionalProperties": false
}
```

### 8.3 MCP transport rules

| Rule | Requirement |
|---|---|
| Transport | stdio by default. |
| stdout | Reserved for MCP JSON-RPC messages. |
| stderr | Used for logs/diagnostics only. |
| No banners | Never print banner art or human logs to stdout. |
| No prompts | MCP server must never ask interactive questions. |
| Project root | Server should receive or infer a project root and refuse path traversal. |
| Timeouts | Tool calls must have bounded timeouts. |
| Cancellation | Long-running `stateproof_run` should support cancellation if supported by MCP SDK. |

### 8.4 Claude Code compatibility

Recommended integration:

1. Use shell command:

```bash
stateproof run --reporter json
```

2. Or register MCP server if supported:

```bash
claude mcp add stateproof -- npx -y @stateproof/mcp-server
```

Example MCP config style:

```json
{
  "mcpServers": {
    "stateproof": {
      "command": "npx",
      "args": ["-y", "@stateproof/mcp-server"],
      "env": {
        "NO_COLOR": "1"
      }
    }
  }
}
```

Agent instructions for Claude Code:

```text
Use stateproof_run to verify UI states.
If exit code is 1, inspect data.scenarios[] and fix the failing UI branch.
If exit code is 2, read error.hint and fix configuration.
If exit code is 3, ensure the local app is running or Chromium is installed.
Never use stateproof studio in CI or headless agent mode.
```

### 8.5 Cursor compatibility

Cursor can use Stateproof through:

1. Terminal command.
2. MCP configuration, if MCP is enabled.

Example MCP config:

```json
{
  "mcpServers": {
    "stateproof": {
      "command": "npx",
      "args": ["-y", "@stateproof/mcp-server"]
    }
  }
}
```

Cursor agent guidance:

```text
Run stateproof_list_scenarios before editing scenario files.
Run stateproof_run after UI changes.
Use stateproof_inspect_failure when a scenario fails.
Use screenshot paths to understand missing UI states.
```

### 8.6 OpenCode compatibility

For OpenCode or similar terminal-native agents:

Preferred:

```bash
stateproof run --reporter json
```

If OpenCode supports MCP, register:

```json
{
  "mcpServers": {
    "stateproof": {
      "command": "npx",
      "args": ["-y", "@stateproof/mcp-server"]
    }
  }
}
```

If no MCP support, create a custom shell tool:

```text
Tool name: stateproof_run
Command: stateproof
Args: run --reporter json
```

### 8.7 Kilo compatibility

For Kilo or similar coding agents:

If Kilo supports MCP:

```json
{
  "mcpServers": {
    "stateproof": {
      "command": "npx",
      "args": ["-y", "@stateproof/mcp-server"]
    }
  }
}
```

If Kilo only supports shell execution:

```bash
stateproof run --reporter json > stateproof-result.json
```

Then parse:

```bash
jq '.ok, .error, .data.scenarios' stateproof-result.json
```

### 8.8 Generic MCP client compatibility

Any MCP-compatible client should be able to use Stateproof by launching:

```bash
npx -y @stateproof/mcp-server
```

The server must:

- Speak MCP over stdio.
- Expose tool schemas.
- Return structured envelopes.
- Avoid interactive prompts.
- Respect project-root jail.
- Never expose arbitrary shell commands.

---

## 9. Feature Pillar 1: Interactive Terminal Studio

### 9.1 Purpose

Terminal Studio eliminates manual JSON hand-authoring by letting a developer:

- Choose a local app route.
- Observe network requests made by that route.
- Select a request to intercept.
- Choose one of the canonical states:
  - Normal passthrough.
  - Loading delay.
  - Empty fixture.
  - Error response.
  - Offline abort.
- Choose viewports.
- Run a live proof.
- Save the scenario to `stateproof.scenarios.json`.

### 9.2 UX rules

| Rule | Requirement |
|---|---|
| TTY only | Launch only in interactive terminal. |
| No CI hang | Never wait on stdin when not TTY. |
| No alt-screen by default | Prefer line-based UI to preserve terminal history. |
| Keyboard first | Arrow keys, Enter, Space, `S` save, `Q` quit. |
| Graceful exit | Ctrl+C must clean up browser and temp state. |
| No JSON corruption | Never mix TUI output with `--reporter json`. |
| Save via core | Scenario writing must use core schema validation. |
| Atomic write | Write to temp file, then rename. |
| No secret writing | Secret scanner must run before saving fixtures/inline bodies. |

### 9.3 Studio workflow

1. Start Stateproof Studio.

```bash
stateproof studio
```

2. Detect or enter local app URL.

```text
Target: http://localhost:5173
```

3. Discover routes.

Possible sources:

- User-entered route.
- Recently used routes from scenario file.
- Optional local crawler for same-origin links.
- Optional request observation after user navigates.

4. Select request.

```text
GET /api/account
POST /api/account/save
```

5. Select state.

```text
[ ] Normal
[ ] Loading
[ ] Empty
[*] Error
[ ] Offline
```

6. Select viewports.

```text
[x] desktop 1440x1024
[x] mobile 390x844
```

7. Run preview.

8. Show PASS/FAIL/ERROR card.

9. Save scenario.

### 9.4 Studio output rules

Studio may show:

```text
PASS  account-loading  desktop  3.1s
FAIL  account-error    mobile   15.0s  selector timeout
hint  render a visible error state when /api/account returns HTTP 500
```

Studio must not show:

- WARN.
- SKIP.
- “Success guaranteed”.
- “Bug-free”.
- External network status unless explicitly requested.

### 9.5 Studio failure cases

| Failure | Behavior |
|---|---|
| Non-TTY environment | Exit `2`, `INTERACTIVE_TTY_REQUIRED`. |
| App unreachable | Show hint: start dev server. |
| Browser missing | Show hint: `pnpm exec playwright install chromium`. |
| Fixture path invalid | Show `FIXTURE_PATH_FORBIDDEN` hint. |
| Secret detected | Warn by default; fail under `--strict-secrets`. |
| User quits during run | Abort browser contexts safely and remove lock. |

---

## 10. Feature Pillar 2: Smart Selector Analyzer

### 10.1 Purpose

Reduce selector friction by suggesting stable selectors for:

- Loading states.
- Empty states.
- Error states.
- Retry controls.
- Alert regions.
- Skeletons/spinners.

### 10.2 Strict rules

| Rule | Requirement |
|---|---|
| Advisory only | Suggestions never automatically change pass/fail logic. |
| No API guessing | Analyzer never invents empty responses or API payloads. |
| No DOM upload | DOM inspection stays local. |
| No auto-save | User must explicitly save suggested selectors. |
| Stable selectors preferred | Prefer data attributes over class names. |
| Accessibility-first | Prefer semantic roles and aria attributes when stable. |

### 10.3 Selector priority

Recommended priority:

```text
1. [data-testid='...']
2. [data-state='...']
3. [role='alert']
4. [aria-busy='true']
5. [role='progressbar']
6. semantic element with visible text
7. stable class name
8. nth-child / positional selector
```

Avoid:

- Long positional CSS paths.
- Generated CSS module hashes.
- XPath unless no CSS alternative exists.
- Selectors dependent on dynamic style order.

### 10.4 Loading-state heuristics

Detect:

```text
[aria-busy='true']
[role='progressbar']
[data-state='loading']
[class*='skeleton']
[class*='spinner']
[class*='loading']
```

Suggestion format:

```text
hint  detected loading skeleton: [data-state='loading']
hint  detected aria-busy region: [aria-busy='true']
```

### 10.5 Error-state heuristics

Detect:

```text
[role='alert']
[data-state='error']
[class*='error']
button:has-text('Retry')
[data-testid='retry']
```

Suggestion format:

```text
hint  detected retry control: [data-testid='retry']
hint  detected alert region: [role='alert']
```

### 10.6 Empty-state heuristics

Detect:

```text
[data-state='empty']
[class*='empty']
[role='status']
svg[aria-hidden='true'] with nearby empty text
```

Suggestion format:

```text
hint  detected empty state: [data-state='empty']
```

### 10.7 Selector suggestion output

Human output:

```text
FAIL  account-error mobile 15.0s selector timeout
      selector [data-state='error']
      hint    render a visible error branch
      suggest [role='alert']
      suggest [data-testid='error-banner']
```

Machine output should not alter the frozen v0.1 `RunResult` unless contract changes. If contract changes, add an optional additive field such as:

```json
{
  "suggestions": {
    "selectors": [
      "[role='alert']",
      "[data-testid='error-banner']"
    ]
  }
}
```

---

## 11. Feature Pillar 3: Visual Baseline Regression

### 11.1 Purpose

Detect unintended visual regressions across UI states:

- Layout shift.
- Missing component.
- Font failure.
- Broken CSS.
- Incorrect spacing.
- Missing icon or image.
- Color/contrast breakage.

### 11.2 v0.2 visual diff rules

| Rule | Requirement |
|---|---|
| Optional | Visual diff must not break existing v0.1 runs. |
| Baselines explicit | Never auto-create baselines unless user passes update flag. |
| Threshold configurable | Default `0.1%` pixel difference. |
| OS tolerance | Do not fail on tiny anti-aliasing differences. |
| Status remains FAIL | Visual diff failure should produce status `failed`, not a new status. |
| Evidence artifacts | Save baseline, current, and diff images. |
| Offline report | Diff evidence must render in offline HTML report. |
| No external image CDN | All images local. |
| No inline JavaScript by default | Use static side-by-side images unless report contract changes. |

### 11.3 Baseline storage

Recommended production layout:

```text
stateproof/
  baselines/
    account-settings/
      account-loading.desktop.png
      account-loading.mobile.png
      account-error.desktop.png
      account-error.mobile.png
```

Generated diff artifacts:

```text
artifacts/stateproof/account-settings/
  account-loading.desktop.png
  account-loading.desktop.baseline.png
  account-loading.desktop.current.png
  account-loading.desktop.diff.png
```

Why not store baselines only under `artifacts/`?

Because `artifacts/` is generated and usually ignored by Git. Baselines often need to be committed for CI comparison.

This is a contract change.

### 11.4 Visual diff run sequence

1. Run scenario normally.
2. Capture current screenshot.
3. If `--update-baselines`:
   - Write baseline.
   - Skip diff comparison.
4. If `--diff`:
   - Load baseline.
   - Compare with current screenshot.
   - Calculate diff percentage.
   - Write diff image if threshold exceeded.
   - If threshold exceeded:
     - status = `failed`
     - failureCode = `visual-diff-exceeded`
     - hint = explain threshold and baseline update command.

### 11.5 Visual diff failure output

Human:

```text
FAIL  account-error mobile 3.4s visual diff exceeded
      threshold 0.1%
      actual    1.7%
      baseline  stateproof/baselines/account-settings/account-error.mobile.png
      current   artifacts/stateproof/account-settings/account-error.mobile.current.png
      diff      artifacts/stateproof/account-settings/account-error.mobile.diff.png
      hint      inspect diff; if intentional, run: stateproof run --update-baselines
```

Machine failure code:

```text
visual-diff-exceeded
```

### 11.6 Report changes

The HTML report should show:

```text
Scenario: account-error
Viewport: mobile
Visual diff: FAIL
Threshold: 0.1%
Actual: 1.7%

[Baseline image]
[Current image]
[Diff image]
```

Default implementation must remain:

- Static HTML.
- Inline CSS only.
- No inline JavaScript.
- No external assets.
- Works from `file://`.

If an interactive slider is desired, it must be:

- Optional.
- Contract-approved.
- Still offline.
- Still safe from XSS.
- Not required for core proof.

---

## 12. Feature Pillar 4: Native MCP Bridge

### 12.1 Purpose

Make Stateproof a native tool for coding agents instead of a shell command agents must parse manually.

### 12.2 MCP package rules

| Rule | Requirement |
|---|---|
| Package | `@stateproof/mcp-server`. |
| Transport | stdio. |
| Invocation | Local process launched by MCP client. |
| No shell passthrough | Do not expose generic shell execution. |
| No arbitrary fetch | Only run named Stateproof operations. |
| Reuse core | Use same validation, result model, and error codes. |
| No prompts | MCP server must not ask questions. |
| No stdout logs | stdout is reserved for MCP JSON-RPC. |
| Project jail | All file paths must be resolved inside project root. |
| Secret safety | Never return full secrets in tool results. |
| Screenshot paths | Return relative paths when possible. |

### 12.3 Recommended architecture

Current v0.1 architecture says nothing may depend on `@stateproof/cli`.

Therefore, for MCP, introduce a shared orchestration package:

```text
@stateproof/app
```

Responsibilities:

- Run scenarios.
- Validate files.
- List scenarios.
- Export cards.
- Produce envelopes.
- Manage artifacts.
- Coordinate runner and reporter.

Dependency graph:

```text
cli ─────► app ─────► core
              ├────► playwright-runner
              └────► reporter-html

mcp-server ─► app
```

This avoids:

```text
mcp-server ─► cli
```

which would violate the current architecture.

### 12.4 MCP error behavior

MCP tool errors should return structured envelopes whenever possible.

Example:

```json
{
  "ok": false,
  "schemaVersion": 1,
  "type": "error",
  "data": null,
  "error": {
    "code": "SCENARIO_FILE_MISSING",
    "message": "Scenario file not found: stateproof.scenarios.json",
    "hint": "Run `stateproof init` or pass --file."
  }
}
```

Transport-level MCP errors should be reserved for cases where a tool result envelope cannot be produced.

---

## 13. How Stateproof Works in Production on Another Computer

This section explains what happens when Stateproof is installed and run on a different machine, such as:

- A teammate's laptop.
- A fresh CI runner.
- A build server.
- A coding-agent sandbox.
- A Docker container.

### 13.1 Required environment

| Requirement | Purpose |
|---|---|
| Node.js >= 20 | Runs Stateproof CLI and MCP server. |
| pnpm, npm, or compatible package manager | Installs dependencies. |
| Chromium via Playwright | Executes controlled browser. |
| Filesystem write access | Needed for artifacts and report. |
| Local app reachable on loopback | Needed for default run. |
| Network access for initial install | Needed to install packages and Chromium. |
| No network access needed for report viewing | HTML report is offline. |

### 13.2 Fresh machine installation flow

For a repository contributor:

```bash
git clone <repo>
cd stateproof
pnpm install
pnpm -r build
pnpm exec playwright install chromium
pnpm lint
pnpm typecheck
pnpm test
```

For an app developer installing Stateproof into their own project:

```bash
npm install -D @stateproof/cli
pnpm exec playwright install chromium
```

Or:

```bash
pnpm add -D @stateproof/cli
pnpm exec playwright install chromium
```

### 13.3 Where Playwright installs Chromium

Playwright installs browsers into a user-level cache by default.

Typical locations:

```text
Linux:   ~/.cache/ms-playwright
macOS:   ~/Library/Caches/ms-playwright
Windows: %USERPROFILE%\AppData\Local\ms-playwright
```

If a CI machine needs a custom location, use standard Playwright environment variables, for example:

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers
```

Stateproof itself should not invent its own browser cache mechanism.

### 13.4 Runtime behavior on another machine

When a user runs:

```bash
stateproof run --reporter json
```

Stateproof performs this sequence:

1. Parse CLI flags.
2. Resolve scenario file.
3. Parse strict JSON.
4. Validate schema.
5. Run pre-browser validation:
   - Duplicate ids.
   - Duplicate viewport names.
   - Kebab-case ids/names.
   - Pattern breadth.
   - Cross-origin patterns.
   - Fixture path jail.
   - Fixture size.
   - Fixture JSON validity.
   - Body serializability.
   - Viewport ranges.
   - Secret scan warnings.
6. Check `baseUrl` reachability.
7. Enforce loopback guardrail.
8. Acquire artifact lock.
9. Clean stale generated artifacts.
10. Launch Chromium once.
11. For each scenario × viewport:
   - Create fresh browser context.
   - Register catch-all route handler before navigation.
   - Navigate to `baseUrl + route`.
   - Intercept matching requests.
   - Apply response mode.
   - Wait for expected selectors.
   - Apply `stableMs` if present.
   - Scroll first selector into view.
   - Capture viewport screenshot.
   - Close context.
12. Write `run.json`.
13. Write Markdown and JSON cards.
14. Generate HTML report.
15. Release artifact lock.
16. Print envelope or human summary.
17. Exit with correct exit code.

### 13.5 What is written on disk

After a run:

```text
artifacts/stateproof/<name>/
  .lock                  # only during active run
  run.json
  card.md
  card.json
  trace.md               # only on unexpected crash
  <scenarioId>.<viewportName>.png
  report/
    index.html
    assets/
      *.png
```

After v0.2 visual diff:

```text
artifacts/stateproof/<name>/
  <scenarioId>.<viewportName>.current.png
  <scenarioId>.<viewportName>.diff.png

stateproof/baselines/<name>/
  <scenarioId>.<viewportName>.png
```

After `init`:

```text
stateproof.scenarios.json
fixtures/
.gitignore entry for artifacts/
```

### 13.6 What does not happen

Stateproof must not:

- Send telemetry.
- Upload screenshots.
- Upload crash logs.
- Call external font CDNs.
- Call external analytics.
- Modify the user's app source.
- Modify system proxy.
- Modify hosts file.
- Start a long-running daemon.
- Require a database.
- Require user accounts.
- Require cloud authentication.

### 13.7 Offline behavior

Stateproof requires network for:

- Initial installation.
- Chromium download.
- Accessing the configured app if that app is remote.

Stateproof does not require network for:

- Viewing HTML report.
- Reading cards.
- Inspecting artifacts.
- Running against a local app already running on loopback.
- Exporting cards from existing artifacts.

### 13.8 CI production behavior

In CI:

```bash
CI=true
```

Stateproof must:

- Disable TUI.
- Disable prompts.
- Disable spinners.
- Emit deterministic output.
- Exit with semantic exit code.
- Write artifacts to workspace.
- Work headlessly.
- Respect `NO_COLOR`.

Example CI job:

```yaml
jobs:
  stateproof:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install
      - run: pnpm -r build
      - run: pnpm exec playwright install chromium

      - run: pnpm --filter react-vite-demo dev &
      - run: pnpm stateproof run --reporter json

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: stateproof-artifacts
          path: artifacts/stateproof
          retention-days: 7
```

For Windows CI, use the same logic with OS-appropriate shell syntax.

### 13.9 Docker/container behavior

If used in a container:

- Install Node >= 20.
- Install Playwright Chromium dependencies.
- Run headless.
- Ensure artifacts directory is writable.
- Avoid running as root where possible.
- Do not require X11 or display.

Example conceptual Dockerfile:

```dockerfile
FROM node:20-bookworm

WORKDIR /app
COPY . .

RUN corepack enable
RUN pnpm install
RUN pnpm -r build
RUN pnpm exec playwright install --with-deps chromium

CMD ["pnpm", "stateproof", "run", "--reporter", "json"]
```

### 13.10 Production troubleshooting table

| Symptom | Likely error code | Cause | Fix |
|---|---|---|---|
| Scenario file not found | `SCENARIO_FILE_MISSING` | Wrong path or not initialized | Run `stateproof init` or pass `--file`. |
| Invalid JSON syntax | `SCHEMA_INVALID` | Trailing comma, comments, malformed JSON | Fix JSON syntax; use strict JSON. |
| App not reachable | `APP_UNREACHABLE` | Dev server not running | Start app or fix `--url`. |
| Non-loopback URL blocked | `NON_LOOPBACK_URL` | URL is remote | Use localhost or pass `--allow-remote`. |
| Chromium missing | `BROWSER_MISSING` | Browser not installed | Run `pnpm exec playwright install chromium`. |
| Artifact directory locked | `ARTIFACT_LOCKED` | Another run active or stale lock | Wait for run to finish or remove stale lock if safe. |
| Secret detected | `SECRET_SCAN_FAILED` | Inline body/fixture contains secret-like value | Replace with placeholder. |
| Fixture path forbidden | `FIXTURE_PATH_FORBIDDEN` | Absolute path or `..` traversal | Keep fixture inside scenario file directory. |
| Studio in CI | `INTERACTIVE_TTY_REQUIRED` | No TTY | Use `stateproof run --reporter json`. |
| Visual diff failed | `VISUAL_DIFF_FAILED` or failure `visual-diff-exceeded` | UI changed from baseline | Inspect diff or update baselines intentionally. |

### 13.11 Uninstall behavior

If installed via npm/pnpm:

```bash
npm uninstall @stateproof/cli
```

or:

```bash
pnpm remove @stateproof/cli
```

Stateproof does not need special uninstall cleanup.

Optional manual cleanup:

```text
artifacts/stateproof/
stateproof.scenarios.json
fixtures/
stateproof/baselines/
Playwright browser cache
```

---

## 14. How to Verify Logic in Stateproof

This section defines how to verify both:

1. That the codebase is correct.
2. That Stateproof is actually proving UI states at runtime.

### 14.1 Static verification

Run:

```bash
pnpm lint
pnpm typecheck
```

Expected:

- Biome lint passes.
- TypeScript strict mode passes.
- No `any` without justification.
- No floating promises.
- No illegal cross-package imports.

### 14.2 Build verification

Run:

```bash
pnpm -r build
```

Expected:

- All packages compile.
- Generated `schema/v1.json` matches committed output.
- No drift between Zod schema and JSON Schema.

### 14.3 Unit verification for core

Run:

```bash
pnpm --filter @stateproof/core test
```

Required coverage:

- >= 90% line coverage in `packages/core`.
- Every `FailureCode` covered.
- Schema validation tested.
- Matcher tested.
- Exit-code precedence tested.
- Card rendering tested.
- Secret scanner tested.
- Fixture path validation tested.
- Body serialization validation tested.

Important core tests:

```text
rejects comments in JSON
rejects trailing commas
rejects duplicate scenario ids
rejects duplicate viewport names
rejects non-kebab-case ids
rejects overly broad patterns
rejects cross-origin patterns
rejects fixture traversal
rejects fixture over 1 MB
rejects invalid JSON fixture
rejects unserializable inline body
maps exit codes with precedence 4 > 3 > 2 > 1 > 0
escapes pipes in Markdown card
renders PASS/FAIL/ERROR only
warns on secrets by default
fails secrets under --strict-secrets
```

### 14.4 Runner integration verification

Run:

```bash
pnpm --filter @stateproof/playwright-runner test
```

Test against:

```text
examples/react-vite-demo
```

Required runner tests:

```text
delay mode holds first matching request
delay mode aborts delayed request after capture
delay mode fails with request-not-intercepted when no request appears
fixture mode fulfills with fixture body
inline mode fulfills with inline body
error mode fulfills with error status
offline mode aborts matched request with internetdisconnected
offline mode does not use context.setOffline(true)
third-party requests blocked by default
third-party requests allowed with --allow-third-party
data: and blob: requests pass
non-matching method passes through
non-matching pathname passes through
selector timeout produces failure screenshot
selector unstable restarts stableMs wait
viewport screenshot is viewport-only
browser contexts are isolated per scenario × viewport
zero unresolved routes
zero hangs across repeated runs
```

Required stability test:

```text
50 consecutive runs with zero hangs.
```

### 14.5 CLI contract verification

Run:

```bash
pnpm --filter @stateproof/cli test
```

CLI tests must spawn real processes.

Required cases:

```text
valid run exits 0
failed scenario exits 1
usage/config error exits 2
app unreachable exits 3
internal error exits 4
unknown flag exits 2
missing file exits 2
unknown scenario id exits 2
zero selected runs exits 2
--reporter json emits one JSON document on stdout
diagnostics go to stderr
NO_COLOR disables color
piped output has no spinners
partial result envelope works
init refuses overwrite without --force
list validates without browser
export resolves artifact directory correctly
```

Snapshot normalization must replace:

```text
timestamps
durations
runId
browser version
absolute paths
```

### 14.6 Report verification

Run:

```bash
pnpm --filter @stateproof/reporter-html test
```

Required tests:

```text
report opens from file://
no external URLs exist
assets exist
all dynamic strings escaped
no inline JavaScript
state matrix renders PASS/FAIL/ERROR
failure details appear only when needed
footer metadata includes version, browser, runId, timestamp, file
axe scan has zero critical violations
keyboard navigation works
screenshots have alt text
```

XSS verification examples:

```text
scenario id: <script>alert(1)</script>
label:"><img src=x onerror=alert(1)>
selector: [data-x='<b>']
message: Failed & "quoted"
```

The report must escape:

```text
& < > " '
```

### 14.7 Golden-path verification

The golden path must prove:

1. Developer starts demo app.
2. Developer initializes scenario file.
3. Developer runs scenarios.
4. Stateproof captures loading state using `delay`.
5. Stateproof captures empty state using fixture.
6. Stateproof captures error state using error mode.
7. Stateproof captures offline state using request-level abort.
8. One scenario intentionally fails.
9. Developer fixes the UI.
10. Rerun passes.
11. Card is exported.
12. HTML report opens offline.

### 14.8 Agent-loop verification

Simulate an agent:

```bash
stateproof run --reporter json > result.json
```

Then verify:

```bash
jq '.ok' result.json
jq '.error' result.json
jq '.data.scenarios[] | {id, status, failureCode, hint}' result.json
```

Required assertions:

```text
stdout is valid JSON
only one JSON document exists on stdout
exit code matches envelope ok state
failure hints are present
screenshot paths exist
agent can retry based on exit code
```

### 14.9 MCP verification

Required MCP tests:

```text
server starts over stdio
tools/list returns schemas
stateproof_list_scenarios works
stateproof_run works
stateproof_run returns partial results on fatal mid-run error
stateproof_inspect_failure returns screenshot and hint
stateproof_export_card returns md/json
server never writes logs to stdout
server rejects path traversal
server handles timeout
server handles cancellation
server returns structured error envelopes
```

### 14.10 TUI verification

Required TUI tests:

```text
studio launches only when TTY
studio exits 2 in CI
studio exits 2 when stdout piped
studio exits 2 when --reporter json
studio restores terminal state
studio handles Ctrl+C
studio writes valid scenario file
studio refuses to write invalid schema
studio runs secret scanner before saving
studio does not emit JSON envelope unless explicitly requested
```

Manual TUI test:

```text
1. Open terminal.
2. Run stateproof studio.
3. Navigate with arrow keys.
4. Toggle states.
5. Press Enter to run.
6. Verify PASS/FAIL/ERROR output.
7. Press S to save.
8. Validate saved JSON.
9. Quit and ensure terminal scrollback is not corrupted.
```

### 14.11 Visual diff verification

Required tests:

```text
no baseline + --diff produces helpful error or hint
--update-baselines writes baseline
same screenshot passes
changed screenshot fails when threshold exceeded
threshold is configurable
diff image highlights changed pixels
diff artifacts are written to artifacts directory
report includes baseline/current/diff images
visual diff does not emit new status word
visual diff failure uses failureCode visual-diff-exceeded
```

### 14.12 Cross-platform verification

CI must run on:

```text
ubuntu-latest
windows-latest
```

Verify:

```text
path separators
artifact paths
lockfile removal
Playwright browser launch
screenshot names
CLI snapshots
report file:// behavior
```

Use path normalization. Do not hand-roll path math.

### 14.13 Release verification checklist

Before tagging a v0.2 release:

```text
[ ] pnpm install succeeds on fresh machine
[ ] pnpm -r build succeeds
[ ] pnpm lint succeeds
[ ] pnpm typecheck succeeds
[ ] pnpm test succeeds
[ ] playwright install chromium succeeds
[ ] golden path demo succeeds
[ ] intentional failure produces correct failure code
[ ] rerun after fix passes
[ ] report opens offline
[ ] JSON envelope is valid
[ ] exit codes verified
[ ] MCP server passes conformance tests
[ ] studio refuses CI mode
[ ] visual diff baselines work
[ ] no external network requests in report
[ ] docs updated
[ ] contract.md updated for any new flags/errors/deps
```

---

## 15. Security and Privacy Requirements

### 15.1 Filesystem discipline

Stateproof writes only to:

```text
artifacts/stateproof/
stateproof.scenarios.json
fixtures/
.gitignore entries created by init
stateproof/baselines/   # proposed v0.2, requires contract change
```

### 15.2 Secret scanning

Secret scanner applies to:

```text
inline bodies
fixture files
studio-saved fixtures
studio-saved inline bodies
```

Patterns:

```text
sk-
ghp_
AKIA
high-entropy strings longer than 40 characters
```

Default:

```text
warn on stderr and continue
```

Strict:

```text
--strict-secrets exits 2 with SECRET_SCAN_FAILED
```

Never print the full secret.

### 15.3 HTML report safety

The reporter must:

```text
escape all dynamic strings
use no raw innerHTML for dynamic values
use no inline JavaScript by default
use no external fonts/CSS/images
work from file://
```

### 15.4 Shell safety

Stateproof must never:

```text
execute shell strings with interpolated user input
use exec() with dynamic strings
pass user input to shell -c
```

Use argument arrays only.

### 15.5 MCP safety

MCP server must:

```text
jail file access to project root
reject path traversal
not expose shell execution
not expose arbitrary fetch interception
return redacted error messages
never print secrets
```

---

## 16. Design Rules for v0.2

All v0.2 surfaces follow `design.md`.

### 16.1 Status vocabulary

```text
PASS
FAIL
ERROR
```

Reserved:

```text
WARN
SKIP
```

Do not emit reserved statuses unless contract changes.

### 16.2 Color meaning

| Color | Meaning |
|---|---|
| Signal lime | Proof/pass/capture. |
| Cobalt | Routes/navigation/links. |
| Red | FAIL/ERROR. |
| Amber | Reserved. |
| Gray | Reserved for future SKIP/meta. |

Never use lime for links. Never use cobalt for pass/fail.

### 16.3 Terminal output

```text
STATEPROOF 0.2.0 — runtime validation
account-settings · 3 scenarios × 2 viewports
PASS  account-loading  desktop  3.1s   [data-state='loading']
FAIL  account-error    mobile   15.0s  selector timeout
      artifact artifacts/stateproof/account-settings/account-error.mobile.png
      hint    render a retry control below 420px
5 passed · 1 failed                              exit 1
```

Rules:

- No spinners when piped.
- No alt-screen in CI.
- Hints indented under failure.
- Data lines should stay readable under 100 chars where possible.

### 16.4 Report rules

Report remains:

```text
offline
static
escaped
keyboard accessible
printable
evidence-first
```

---

## 17. Definition of Done for v0.2 Features

A v0.2 feature is done only when:

```text
[ ] contract.md updated if flags/errors/deps changed
[ ] architecture.md updated if package graph changed
[ ] implementation-plan.md updated with phase gates
[ ] code compiles under strict TypeScript
[ ] Biome lint passes
[ ] unit tests pass
[ ] integration tests pass where browser behavior touched
[ ] CLI snapshot tests pass where output touched
[ ] report tests pass where report touched
[ ] agent JSON envelope remains parseable
[ ] CI mode verified
[ ] TTY guardrail verified if interactive feature
[ ] docs updated
[ ] no privacy rule weakened
[ ] no external network introduced
[ ] no new dependency without justification
```

---

## 18. Open Questions

| Question | Recommendation |
|---|---|
| Should baselines be committed by default? | Yes, for CI usefulness. Store outside `artifacts/`. |
| Should visual diff be part of exit code 1? | Yes, if enabled and threshold exceeded. |
| Should selector suggestions appear in JSON envelope? | Only after additive contract/version decision. |
| Should Studio observe requests via CDP or page route events? | Prefer route/page request events inside controlled context; avoid broad CDP overreach. |
| Should MCP server use `@stateproof/app`? | Yes, to avoid depending on CLI. |
| Should report include JS slider? | Not by default. Keep static offline report. |
| Should TUI be separate package? | Start inside CLI; split only if complexity grows. |
| Should Stateproof support headed mode? | Not in initial v0.2 unless contract changes. |
| Should Stateproof support Firefox/WebKit? | Not in initial v0.2. Chromium only. |

---

## 19. Acceptance Criteria for v0.2

Stateproof v0.2 is acceptable when:

```text
1. Existing v0.1 commands still work unchanged.
2. Existing v0.1 JSON envelope remains parseable.
3. Exit codes remain deterministic.
4. Studio launches only in interactive TTY.
5. Studio never hangs CI.
6. Studio saves schema-valid scenario files.
7. Selector suggestions are advisory only.
8. Visual diff produces stable baseline/current/diff artifacts.
9. Visual diff failure produces FAIL status and clear hint.
10. HTML report remains offline and injection-safe.
11. MCP server passes tool conformance tests.
12. MCP server never writes logs to stdout.
13. Claude Code, Cursor, OpenCode, and Kilo can use Stateproof through shell JSON or MCP.
14. Fresh machine install works on Ubuntu and Windows.
15. No telemetry or external report requests are introduced.
16. All docs are updated to as-built state.
```