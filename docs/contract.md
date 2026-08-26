
---

# Stateproof v0.1 Coding Contract

## 0. Purpose

This contract removes ambiguity before building Stateproof.

The coding agent must not guess:

- scenario file format
- CLI grammar
- exit-code behavior
- response-mode behavior
- offline behavior
- artifact behavior
- report behavior
- security rules
- what belongs in each package

If a detail is missing here, the coding agent must stop and ask. Do not invent behavior.

---

# 1. Order of work

## Mandatory pre-build step

Before implementing `@stateproof/core` schema or CLI logic:

1. Update the five project docs using the changes in **Section 2**.
2. Commit the doc updates.
3. Only then start P1.

## Contract precedence

Until docs are updated:

> This contract overrides `architecture.md`, `implementation-plan.md`, `userflow.md`, `design.md`, and `rules.md`.

---

# 2. What to fix in each document

## 2.1 Fix `architecture.md`

Update these exact items:

### A. Scenario file model

Replace the current scenario model with the contract model in **Section 4**.

Key changes:

- `viewports` is optional.
- `expect.visible` may be a string or array of strings.
- Add optional `expect.stableMs`.
- Add `runId` to `RunResult`.
- Add `hint` to `ScenarioOutcome`.
- Remove open-ended `FailureCode` list; use the exact list in **Section 7.4**.
- Do not use `...` in types or error lists.

### B. Response-mode behavior

Replace current response-mode behavior with:

- `delay` means **hold request pending for screenshot**, then abort.
- `delay` does **not** pass through the real response in v0.1.
- `offline` means **abort matched request with network error**, not `context.setOffline(true)`.
- Fixture, inline, and error modes fulfill the request.
- All non-`baseUrl` requests are blocked by default unless `--allow-third-party` is passed.

### C. Runner behavior

Specify:

- one catch-all route handler
- routes registered before `goto`
- `serviceWorkers: "block"`
- `goto` uses `waitUntil: "domcontentloaded"`
- every route is resolved
- delayed requests are aborted after screenshot
- screenshot is viewport-only, not full page
- scroll first expected selector into view before screenshot
- fresh context per scenario × viewport
- headless by default in CLI `run`

### D. CLI contract

Replace CLI table with the exact CLI contract in **Section 5**.

Remove:

- `--browser-channel` from v0.1 scope

Add:

- `--url`
- `--scenario`
- `--file`
- `--allow-third-party`
- `--strict-secrets`

### E. Exit-code contract

Replace exit-code section with **Section 7**.

Add:

- exact error codes
- exact precedence
- partial-result behavior
- `runId`

### F. Package responsibility correction

Change:

> Core owns terminal summary.

to:

> Core owns pure Markdown and JSON card rendering. CLI owns terminal presentation.

Reason: `core` must stay pure and not depend on TTY, color detection, or platform output behavior.

### G. Report model

Replace:

> single self-contained `index.html`

with:

> self-contained offline report directory

Report layout must be:

```text
report/
  index.html
  assets/
    *.png
```

HTML must not use external network requests.

### H. Security section

Add the exact controls in **Section 9**.

---

## 2.2 Fix `implementation-plan.md`

Update these exact items:

### A. Add P0.5 contract gate

Insert before P1:

```text
P0.5 — Contract freeze
[ ] Update all planning docs to match CODING_CONTRACT.md
[ ] No schema work starts until docs are aligned
Exit gate: no unresolved contract contradictions
```

### B. P1 changes

Update P1 to include:

- strict JSON scenario parsing
- no comment parsing
- location-aware JSON syntax errors
- schema errors use JSON path + hint
- exact error-code registry
- exact `RunResult` with `runId`
- exact `FailureCode` list
- Markdown + JSON card renderer only
- no terminal renderer in core
- fixture secret scanner with optional strict failure
- validation for:
  - duplicate scenario ids
  - duplicate viewport names
  - kebab-case ids/names/viewport names
  - overly broad patterns
  - cross-origin patterns
  - fixture path traversal
  - fixture size limits
  - JSON fixture validity

### C. P2 changes

Update P2 to include:

- one catch-all route handler
- delay mode holds request and aborts after capture
- offline mode aborts matched request with network error
- third-party request blocking by default
- method matching
- first-request-only behavior for delay mode
- selector stability wait
- scroll into view before screenshot
- artifact lockfile
- stale artifact cleanup
- `runId`
- `trace.md` on unexpected crash
- no unresolved routes
- global scenario watchdog

Remove wording that says delay mode passes through real traffic.

### D. P3 changes

Update P3 to include:

- exact CLI flags from **Section 5**
- `init` does not check app reachability
- `init` does not overwrite without `--force`
- `run` checks app reachability
- `run --url` override
- `--allow-remote`
- `--allow-third-party`
- `--strict-secrets`
- snapshot normalization for:
  - timestamps
  - durations
  - runId
  - browser version
  - absolute paths

Remove:

> init scaffolds commented scenario file

Replace with:

> init scaffolds strict JSON with `$comment` and `note` fields only.

### E. P4 changes

Update P4:

- report is a directory, not one HTML file
- screenshots are copied to `report/assets/`
- all dynamic strings are HTML-escaped
- no inline JavaScript
- no external fonts, CSS, images, or requests
- no WARN/SKIP statuses in v0.1

### F. P5 changes

Update demo requirements:

- no external network
- no external fonts
- deterministic state branches
- stable selectors:
  - `[data-state='loading']`
  - `[data-state='empty']`
  - `[data-state='error']`
  - `[data-state='offline']`
  - `[data-testid='retry']`
- mobile bug toggle hides retry control under 420px
- loading state is testable using delay mode
- offline state is testable using request-level abort

### G. CI changes

Add explicit CI requirement:

```bash
pnpm install
pnpm -r build
pnpm lint
pnpm typecheck
pnpm test
pnpm exec playwright install chromium
```

CI must run on Ubuntu and Windows.

---

## 2.3 Fix `userflow.md`

Update these exact items:

### A. Companion panel

Mark companion panel as future.

For v0.1, Flow A must say:

> Scenario authoring in v0.1 is by hand-editing JSON. Companion panel is post-0.1.

### B. Init behavior

Change Flow A so `init` does not require app reachability.

Correct order:

1. `stateproof init`
2. scenario file scaffolded
3. user starts app
4. `stateproof run`
5. `run` checks reachability

### C. Commented JSON

Remove:

> heavily commented

Replace with:

> concise annotated JSON using `$comment` and `note` fields

Reason: JSON does not support comments.

### D. CLI examples

Make examples match CLI contract.

Valid examples:

```bash
stateproof run
```

Runs default `stateproof.scenarios.json`.

```bash
stateproof run account-settings
```

Runs all scenarios in default file only if the file’s `name` is `account-settings`.

```bash
stateproof run account-error
```

Runs the scenario whose `id` is `account-error`.

```bash
stateproof run --file custom.scenarios.json
stateproof run --scenario account-error
stateproof run --viewport mobile
```

### E. Add missing flags

Document:

- `--url`
- `--file`
- `--scenario`
- `--allow-third-party`
- `--strict-secrets`

### F. Remove WARN

Do not show WARN in v0.1 examples.

If retry control is missing, that is:

```text
FAIL
```

not WARN.

---

## 2.4 Fix `design.md`

Update these exact items:

### A. Status model

For v0.1, only these statuses exist:

```text
PASS
FAIL
ERROR
```

WARN and SKIP are reserved, not emitted.

Update all examples.

### B. Card example

Remove this row:

```text
Error (500) @ mobile | ⚠ WARN
```

Replace with a normal FAIL row if the retry selector is missing.

### C. Report

Replace:

> Single self-contained file

with:

> Self-contained offline report directory

Report must use:

```text
report/index.html
report/assets/*.png
```

### D. Fonts

State explicitly:

> CLI and HTML report must not fetch fonts from the network. Use local/system font stacks only.

Marketing site may use self-hosted fonts later, but not report or CLI.

### E. Terminal words

Terminal statuses must be:

```text
PASS
FAIL
ERROR
```

Never rely on glyph or color only.

---

## 2.5 Fix `rules.md`

Update these exact items:

### A. Remove unspecified `.stateproofignore`

For v0.1, remove `.stateproofignore` from active rules.

It is not implemented.

Secret scanner behavior is:

- warnings by default
- fail when `--strict-secrets` is passed

### B. Add filesystem safety rule

Add:

> Fixture paths are relative to the scenario file and jailed to the scenario file directory. Absolute paths and parent-directory traversal are rejected.

### C. Add HTML escaping rule

Add:

> All dynamic strings in HTML reports are escaped. The reporter must not inject raw user-controlled HTML.

### D. Add process-spawning rule

Add:

> Stateproof must not spawn commands through a shell with interpolated user input. Use argument-array APIs only.

### E. Add URL privacy rule

Add:

> Debug logs may include method, path, status, and timing. Query-string values must be redacted.

### F. Add third-party request rule

Add:

> In the controlled browser, requests whose origin is not the `baseUrl` origin are blocked by default unless `--allow-third-party` is passed.

### G. Clarify stdout/stderr

Add:

> With `--reporter json`, stdout contains exactly one JSON document. Human reporter may print styled output to stdout. Diagnostics go to stderr.

---

# 3. Frozen v0.1 product scope

The coding agent must build only this scope.

## 3.1 Included in Version 1

Stateproof Version 1:

- runs locally
- launches bundled Chromium headlessly
- intercepts same-origin requests in a controlled browser context
- forces one request rule per scenario
- waits for expected visible selector(s)
- captures screenshots
- writes artifacts
- writes Markdown card, JSON card, and offline HTML report
- exits with stable exit codes
- prints stable JSON for agents
- Terminal Studio (`stateproof studio`) for interactive scenario creation with TTY safety
- Smart Selector Analyzer for advisory loading/error/empty state heuristics
- Visual Baseline Regression (`--diff`, `--update-baselines`) with offline HTML diff evidence
- Native Model Context Protocol (MCP) server bridge for coding agents

## 3.2 Not included in Version 1

Do not implement:

- companion web panel / GUI daemon
- cloud sync / remote storage
- user interactions like click, fill, hover
- authentication flows
- storageState setup
- multiple request rules per scenario
- GraphQL body matching
- redaction
- WARN status
- SKIP status
- headed browser mode
- remote browser execution unless explicitly allowed

If a feature is not in this contract, it is out of scope.

---

# 4. Scenario file contract

## 4.1 File format

The scenario file is:

```text
stateproof.scenarios.json
```

Format:

- strict JSON
- UTF-8
- no comments
- no trailing commas
- no JSON5
- no JSONC parsing for user files

Useful annotations are done with:

- top-level `$comment`
- scenario `note`

Example:

```json
{
  "$schema": "https://stateproof.dev/schema/v1.json",
  "$comment": "Stateproof scenarios for account settings.",
  "name": "account-settings",
  "baseUrl": "http://localhost:5173",
  "route": "/account/settings",
  "scenarios": [
    {
      "id": "account-loading",
      "label": "Loading",
      "note": "Proves the loading skeleton renders while account request is pending.",
      "request": {
        "method": "GET",
        "urlPattern": "**/api/account"
      },
      "response": {
        "mode": "delay",
        "milliseconds": 2000
      },
      "expect": {
        "visible": "[data-state='loading']",
        "timeoutMs": 15000,
        "stableMs": 250
      }
    }
  ]
}
```

---

## 4.2 Scenario file schema

Use this exact shape:

```ts
export interface ScenarioFile {
  $schema?: string;
  $comment?: string;
  name: string;
  baseUrl: string;
  route: string;
  viewports?: Viewport[];
  scenarios: Scenario[];
}

export interface Viewport {
  name: string;
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
}

export interface Scenario {
  id: string;
  label?: string;
  note?: string;
  route?: string;
  request?: RequestRule;
  response?: ResponseRule;
  recovery?: RecoveryRule;
  websocket?: WebSocketRule;
  expect: ExpectRule;
}

export interface RequestRule {
  method: HttpMethod;
  urlPattern: string;
}

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS"
  | "HEAD";

export type ResponseRule =
  | DelayResponse
  | FixtureResponse
  | InlineResponse
  | ErrorResponse
  | OfflineResponse;

export interface DelayResponse {
  mode: "delay";
  milliseconds: number;
}

export interface FixtureResponse {
  mode: "fixture";
  path: string;
  status?: number;
  headers?: Record<string, string>;
}

export interface InlineResponse {
  mode: "inline";
  status?: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface ErrorResponse {
  mode: "error";
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface OfflineResponse {
  mode: "offline";
}

export interface ExpectRule {
  visible?: string | string[];
  hidden?: string | string[];
  text?: Record<string, string>;
  attributes?: Record<string, Record<string, string | boolean>>;
  timeoutMs?: number;
  stableMs?: number;
}

export interface RecoveryAction {
  type: 'click';
  selector: string;
}

export interface RecoveryRule {
  action: RecoveryAction;
  response: ResponseRule;
  expect: ExpectRule;
}

export interface WebSocketRule {
  urlPattern: string;
  mode: 'drop-connection' | 'close';
  afterMs?: number;
}
```

---

## 4.3 Validation rules

Validation must happen before browser launch.

### Top-level rules

- `$schema` optional string.
- `$comment` optional string.
- `name` required.
- `name` must match:

```text
^[a-z0-9]+(-[a-z0-9]+)*$
```

- `baseUrl` required.
- `baseUrl` must be `http://` or `https://`.
- `route` required.
- `route` must start with `/`.
- `viewports` optional.
- If `viewports` is present:
  - array must not be empty
  - viewport names must be unique
  - viewport names must be kebab-case
  - width and height must be integers
  - width range: 320–3840
  - height range: 320–3840
  - `deviceScaleFactor` optional positive number
  - `isMobile` optional boolean
- `scenarios` required.
- `scenarios` must contain at least one item.
- No additional properties are allowed.

### Scenario rules

- `id` required.
- `id` must be kebab-case.
- `id` must be unique within the file.
- `label` optional string.
- `note` optional string.
- `request` required.
- `response` required.
- `expect` required.

### Request rules

- `method` must be one of the `HttpMethod` values.
- `urlPattern` required.
- `urlPattern` must be a path glob.
- `urlPattern` must not start with `http://` or `https://`.
- Query strings are ignored during matching.
- Cross-origin patterns are rejected.

Reject these patterns:

```text
*
**
**/*
**/**
```

Also reject any pattern where every path segment is only wildcards.

### Expect rules

- `visible` may be:
  - non-empty string
  - non-empty array of non-empty strings
- Selectors are CSS selectors only.
- Do not support XPath or `text=` selectors in v0.1.
- `timeoutMs` optional integer.
- Default timeout is `15000`.
- `stableMs` optional integer.
- Default `stableMs` is `0`.

### Response rules

#### delay

- `milliseconds` required.
- Must be integer.
- Range: 1–60000.

#### fixture

- `path` required.
- Must be relative.
- Must not contain absolute path.
- Must not escape scenario file directory.
- Must exist.
- Must be readable.
- Max size: 1 MB.
- If extension is `.json`, file must parse as valid JSON.
- `status` optional integer.
- Default status: `200`.
- `headers` optional record of strings.

#### inline

- `body` required.
- `body` must be JSON-serializable.
- Reject:
  - functions
  - symbols
  - undefined values
  - BigInt
- Serialized body max size: 1 MB.
- `status` optional integer.
- Default status: `200`.
- `headers` optional record of strings.

#### error

- `status` required.
- Must be integer.
- Must be between 400 and 599.
- `body` optional.
- If present, body must be JSON-serializable.
- `headers` optional record of strings.

#### offline

- No additional properties.

---

## 4.4 Default viewports

If `viewports` is omitted, use exactly:

```ts
[
  {
    name: "desktop",
    width: 1440,
    height: 1024,
    deviceScaleFactor: 1,
    isMobile: false
  },
  {
    name: "mobile",
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true
  }
]
```

Order matters.

---

# 5. CLI contract

## 5.1 Global behavior

All commands:

- no interactive prompts
- no spinners when piped
- respect `NO_COLOR`
- support `--reporter human|json` where relevant
- write diagnostics to stderr
- write machine data to stdout when JSON reporter is used

Exit codes:

```text
0 pass
1 scenario failure
2 usage/config error
3 environment error
4 internal error
```

---

## 5.2 Commands

### `init`

```bash
stateproof init [options]
```

Flags:

```text
--file <path>
--url <baseUrl>
--route <routePath>
--force
--reporter human|json
```

Behavior:

- Default file: `stateproof.scenarios.json`.
- If file exists and `--force` is absent:
  - exit 2
  - hint: use `--force` to overwrite or edit the existing file
- Creates:
  - scenario file
  - `fixtures/`
  - `.gitignore` entry for `artifacts/`
- Does not check app reachability.
- Does not launch browser.
- Output JSON envelope type:

```text
init.result
```

---

### `run`

```bash
stateproof run [positionals...] [options]
```

Flags:

```text
--file <path>
--scenario <id...>
--viewport <name...>
--url <baseUrl>
--timeout-ms <number>
--allow-remote
--allow-third-party
--strict-secrets
--reporter human|json
--update-baselines
--diff
--baseline-dir <path>
--diff-threshold <number>
```

Positional resolution:

1. If `--file` is provided, use that file.
2. If `--file` is absent, use `stateproof.scenarios.json`.
3. If no positionals and no `--scenario`, run all scenarios in the file.
4. If `--scenario` is provided, positionals are treated as scenario ids.
5. If no `--scenario` is provided and exactly one positional exists:
   - if it equals the scenario file `name`, run all scenarios in the file
   - otherwise treat it as a scenario id
6. If multiple positionals exist, all are scenario ids.
7. Unknown scenario ids cause exit 2.
8. If filters select zero scenario × viewport runs, exit 2.

`--url` precedence:

```text
--url > scenario file baseUrl
```

`--timeout-ms` precedence:

```text
scenario.expect.timeoutMs > --timeout-ms > default 15000
```

---

### `studio`

```bash
stateproof studio [options]
```

Flags:

```text
--file <path>
--url <baseUrl>
--route <routePath>
```

Behavior:

- TTY guardrail: Must execute in an interactive TTY (`process.stdin.isTTY`, `process.stdout.isTTY`, `CI !== 'true'`, `reporter !== 'json'`).
- If invoked in non-TTY, CI, or piped mode: exits with code `2` and `INTERACTIVE_TTY_REQUIRED`.
- Provides interactive terminal step flow:
  1. Local app URL & route input.
  2. Request observation.
  3. Four/five-state switchboard selection (Normal, Loading, Empty, Error, Offline).
  4. Viewport selection.
  5. Live preview execution.
  6. Schema-validated atomic saving with secret scanning.
- Output JSON envelope type (if requested):

```text
studio.result
```

---

### `list`

```bash
stateproof list [options]
```

Flags:

```text
--file <path>
--reporter human|json
```

Behavior:

- validates file
- does not launch browser
- does not check app reachability
- prints scenario summary
- JSON envelope type:

```text
list.result
```

---

### `export`

```bash
stateproof export [options]
```

Flags:

```text
--run <artifactDir>
--file <scenarioFilePath>
--format md|json
```

Default format:

```text
md
```

Behavior:

- If `--run` is provided, use that artifact directory.
- If `--run` is absent:
  1. If `--file` is provided, parse its scenario file `name` and use `artifacts/stateproof/<name>`.
  2. Else if default scenario file exists, use its `name`.
  3. Else if exactly one directory exists under `artifacts/stateproof/`, use it.
  4. Else exit 2 and ask for `--run`.

---

# 6. Runner contract

## 6.1 Browser behavior

For `run`:

- launch Chromium once per run
- headless by default
- one fresh context per scenario × viewport
- block service workers:

```ts
serviceWorkers: "block"
```

Context settings:

```ts
locale: "en-US"
timezoneId: "UTC"
viewport: scenario viewport
deviceScaleFactor: viewport.deviceScaleFactor ?? 1
isMobile: viewport.isMobile ?? false
```

If `baseUrl` is HTTPS loopback:

```ts
ignoreHTTPSErrors: true
```

---

## 6.2 Navigation URL

Navigation URL is:

```ts
new URL(route, baseUrl).toString()
```

Use:

```ts
waitUntil: "domcontentloaded"
```

Do not use `load`, because delayed/pending requests can delay load.

---

## 6.3 Request handling

Use one catch-all route handler.

For every request:

1. If request scheme is `data:` or `blob:`, allow it.
2. If request origin is not `baseUrl` origin:
   - if `--allow-third-party` is passed, allow with `route.fetch()`
   - otherwise abort with `blockedbyclient`
3. If request pathname matches `urlPattern` and method matches:
   - apply scenario response rule
4. Otherwise:
   - allow with `route.fetch()`

Rules:

- `urlPattern` matches pathname only.
- Query strings are ignored.
- Method must match exactly.
- Route must always be resolved.
- Handler errors must abort route safely.
- Never leave a route pending.

---

## 6.4 Response-mode behavior

### delay

Purpose:

> Prove loading/pending UI by keeping the matched request unresolved during capture.

Behavior:

1. When first matching request is intercepted, store it as pending.
2. Do not fulfill it.
3. Wait until:
   - expected selector(s) visible
   - stable wait satisfied
   - at least `milliseconds` have passed since request interception
4. Capture screenshot.
5. Abort pending delayed request with:

```ts
"aborted"
```

Additional rules:

- Delay applies to the first matching request only.
- Later matching requests are aborted with `"aborted"`.
- If matching request is not intercepted before timeout, fail with:

```text
request-not-intercepted
```

Delay mode does not fetch the real response in v0.1.

---

### fixture

Behavior:

- fulfill matching requests with fixture file body
- apply status
- apply headers
- default status `200`
- default `Content-Type` based on file extension:
  - `.json`: `application/json`
  - `.txt`: `text/plain`
  - `.html`: `text/html`
  - otherwise: `application/octet-stream`
- user-provided headers override defaults

---

### inline

Behavior:

- serialize body with `JSON.stringify`
- default status `200`
- default header:

```text
Content-Type: application/json
```

- user-provided headers override defaults

---

### error

Behavior:

- fulfill matching requests with error status
- status must be 400–599
- optional JSON body
- if body exists and no `Content-Type` header is provided, use:

```text
Content-Type: application/json
```

---

### offline

Behavior:

- abort matching requests with:

```ts
"internetdisconnected"
```

Do not use:

```ts
context.setOffline(true)
```

Reason: context-level offline can prevent the local app itself from loading.

---

## 6.5 Selector waiting

For `expect.visible`:

- If string, wait for that selector.
- If array, wait for all selectors.
- Selectors must be visible.
- Use CSS selectors only.

If `stableMs > 0`:

- all selectors must remain visible continuously for `stableMs`
- if any selector becomes hidden, restart stability waiting
- continue until timeout

Before screenshot:

- scroll first selector into view
- capture page viewport screenshot
- do not capture full page

---

## 6.6 Failure capture

On selector timeout:

- attempt failure screenshot
- save screenshot using same semantic filename
- set status:

```text
failed
```

- set failureCode:

```text
selector-timeout
```

On navigation failure:

- set failureCode:

```text
navigation-failed
```

On screenshot failure:

- set failureCode:

```text
capture-failed
```

On unexpected runner crash:

- set status:

```text
error
```

- write `trace.md` if possible
- exit code usually `4`

---

# 7. Exit codes, errors, and JSON contract

## 7.1 JSON envelope

All JSON output uses this envelope:

```json
{
  "ok": false,
  "schemaVersion": 1,
  "type": "run.result",
  "data": {},
  "error": null
}
```

Fields:

- `ok` is `true` only when exit code is `0`
- `schemaVersion` is always `1`
- `type` is a stable string
- `data` is present when there is a result object
- `error` is present when there is a fatal error object

---

## 7.2 Envelope types

Use these exact types:

```text
init.result
list.result
run.result
export.card
studio.result
mcp.tools.list
mcp.tool.result
inspect.result
error
```

---

## 7.3 Exit-code precedence

Use this order:

```text
4 internal error
3 environment error
2 usage/config error
1 scenario failure
0 pass
```

Rules:

- Config errors are detected before browser launch and exit `2`.
- App unreachable exits `3`.
- Browser missing exits `3`.
- If some scenarios fail but run completes, exit `1`.
- If all scenarios pass, exit `0`.
- If a fatal environment/internal error stops the run after partial results, emit partial `data` plus `error` and exit `3` or `4`.

---

## 7.4 Exact FailureCode values

Use only these:

```text
selector-timeout
request-not-intercepted
selector-unstable
navigation-failed
capture-failed
fixture-missing
fixture-invalid
fixture-path-forbidden
body-not-serializable
route-handler-failed
non-loopback-redirect
browser-error
app-unreachable
artifact-locked
internal-error
visual-diff-exceeded
unknown
```

Do not add more without contract change.

---

## 7.5 Exact CLI error codes

Use these machine error codes:

| Error code | Exit code | Meaning |
|---|---:|---|
| `SCENARIO_FILE_MISSING` | 2 | Scenario file not found |
| `SCENARIO_FILE_INVALID_JSON` | 2 | JSON syntax error |
| `SCHEMA_INVALID` | 2 | Zod validation failed |
| `DUPLICATE_SCENARIO_ID` | 2 | Duplicate scenario id |
| `DUPLICATE_VIEWPORT_NAME` | 2 | Duplicate viewport name |
| `PATTERN_TOO_BROAD` | 2 | urlPattern too broad |
| `PATTERN_CROSS_ORIGIN` | 2 | urlPattern tries to match external origin |
| `FIXTURE_MISSING` | 2 | Fixture file missing |
| `FIXTURE_PATH_FORBIDDEN` | 2 | Fixture path traversal or absolute path |
| `FIXTURE_TOO_LARGE` | 2 | Fixture over 1 MB |
| `FIXTURE_INVALID_JSON` | 2 | `.json` fixture is not valid JSON |
| `BODY_NOT_SERIALIZABLE` | 2 | Inline/error body cannot be JSON-serialized |
| `NON_LOOPBACK_URL` | 2 | Remote baseUrl without `--allow-remote` |
| `NON_LOOPBACK_REDIRECT` | 2 | Navigation redirected to non-loopback URL |
| `APP_UNREACHABLE` | 3 | App not reachable within 10s |
| `BROWSER_MISSING` | 3 | Chromium not installed |
| `NO_SCENARIOS_SELECTED` | 2 | Scenario filter matched nothing |
| `NO_VIEWPORTS_SELECTED` | 2 | Viewport filter matched nothing |
| `ARTIFACT_LOCKED` | 2 | Another run is using artifact dir |
| `EXPORT_RUN_MISSING` | 2 | Export cannot find artifact dir |
| `SECRET_SCAN_FAILED` | 2 | Secret scanner found issue and `--strict-secrets` is enabled |
| `INTERACTIVE_TTY_REQUIRED` | 2 | Studio invoked in non-TTY or CI environment |
| `BASELINE_MISSING` | 2 | Baseline file missing for visual diff |
| `BASELINE_WRITE_FAILED` | 2 | Unable to write baseline image |
| `VISUAL_DIFF_FAILED` | 2 | Visual diff execution error |
| `MCP_SERVER_INVALID_PROJECT_ROOT` | 2 | MCP server target directory invalid or outside jail |
| `SELECTOR_SUGGESTION_UNAVAILABLE` | 2 | Selector suggestions unavailable |
| `INTERNAL_ERROR` | 4 | Unexpected internal failure |

Error object shape:

```json
{
  "code": "SCENARIO_FILE_MISSING",
  "message": "Scenario file not found.",
  "hint": "Run stateproof init or pass --file.",
  "file": "stateproof.scenarios.json",
  "runId": null
}
```

---

## 7.6 RunResult contract

```ts
export interface RunResult {
  schemaVersion: 1;
  runId: string;
  stateproofVersion: string;
  browserVersion: string;
  startedAt: string;
  finishedAt: string;
  baseUrl: string;
  file: string;
  scenarios: ScenarioOutcome[];
}

export interface ScenarioOutcome {
  id: string;
  label?: string;
  viewport: Viewport;
  status: "passed" | "failed" | "error";
  failureCode?: FailureCode;
  message?: string;
  hint?: string;
  artifacts: {
    screenshot?: string;
  };
  durationMs: number;
}
```

`runId`:

- generated once per run
- included in `run.json`
- included in JSON envelope when available
- included in report footer
- included in `trace.md`

---

# 8. Artifacts, report, card, and export contract

## 8.1 Artifact directory

Artifact directory:

```text
artifacts/stateproof/<scenario-file-name>/
```

Where `<scenario-file-name>` is the scenario file `name`, not the file basename.

Example:

```text
artifacts/stateproof/account-settings/
```

---

## 8.2 Artifact layout

```text
artifacts/stateproof/account-settings/
  run.json
  card.md
  card.json
  trace.md
  account-loading.desktop.png
  account-loading.mobile.png
  account-error.desktop.png
  account-error.mobile.png
  report/
    index.html
    assets/
      account-loading.desktop.png
      account-loading.mobile.png
```

---

## 8.3 Artifact rules

Before running:

- acquire lockfile:

```text
artifacts/stateproof/<name>/.lock
```

- if lock exists, exit `2` with `ARTIFACT_LOCKED`
- delete known generated files:
  - `*.png`
  - `run.json`
  - `card.md`
  - `card.json`
  - `trace.md`
  - `report/`

After running:

- remove lockfile in `finally`

No concurrent runs are supported for the same artifact directory.

---

## 8.4 Screenshot filenames

Use:

```text
<scenarioId>.<viewportName>.png
```

Example:

```text
account-loading.mobile.png
```

Rules:

- lowercase
- kebab-case
- no timestamps in filename
- no spaces
- one screenshot per scenario × viewport

---

## 8.5 HTML report contract

Report directory:

```text
report/
```

Report must:

- work from `file://`
- make zero network requests
- use inline CSS only
- copy screenshots into `report/assets/`
- escape all dynamic text
- contain no inline JavaScript
- contain no external fonts
- contain no external images
- contain no external CSS

Report contents:

- header metadata
- state matrix table
- screenshot gallery
- failure details
- footer metadata

Footer metadata must include:

- Stateproof version
- browser version
- runId
- ISO timestamp
- scenario file name

---

## 8.6 Markdown card contract

Use only these statuses:

```text
PASS
FAIL
ERROR
```

Card format:

```markdown
## Stateproof Card — Account settings

| State | desktop | mobile |
|---|:---:|:---:|
| Loading | PASS | PASS |
| Empty | PASS | PASS |
| Error | PASS | FAIL |

**Artifacts:** `artifacts/stateproof/account-settings/` — account-loading.desktop.png · account-loading.mobile.png · account-empty.desktop.png · account-empty.mobile.png · account-error.desktop.png · account-error.mobile.png

**Run:** local · Stateproof 0.1.3 · Chromium 141 · runId 01J9ZK... · 2026-08-23T14:02:15Z
```

Rules:

- title uses scenario file `name` or human label
- one row per scenario
- viewport columns follow configured viewport order
- escape pipes in labels
- do not use WARN
- do not use SKIP

---

## 8.7 JSON card contract

`card.json` and `export --format json` use:

```json
{
  "ok": true,
  "schemaVersion": 1,
  "type": "export.card",
  "data": {
    "name": "account-settings",
    "runId": "01J9ZK...",
    "stateproofVersion": "0.1.3",
    "browserVersion": "141",
    "finishedAt": "2026-08-23T14:02:15Z",
    "columns": ["desktop", "mobile"],
    "rows": [
      {
        "scenarioId": "account-loading",
        "label": "Loading",
        "cells": {
          "desktop": "passed",
          "mobile": "passed"
        }
      }
    ],
    "artifacts": [
      "account-loading.desktop.png",
      "account-loading.mobile.png"
    ]
  },
  "error": null
}
```

---

# 9. Security contract

These are mandatory.

## 9.1 Loopback guardrail

Allowed loopback values:

```text
127.0.0.1
::1
[::1]
localhost
```

For non-IP hostnames:

- resolve DNS
- all resolved IPs must be loopback
- if any resolved IP is not loopback, reject unless `--allow-remote`

`0.0.0.0` is not treated as loopback.

If baseUrl is non-loopback:

- without `--allow-remote`: exit `2`
- with `--allow-remote`: continue with warning to stderr

---

## 9.2 Redirect guardrail

If main frame navigates to non-loopback origin:

- fail run
- error code:

```text
NON_LOOPBACK_REDIRECT
```

- exit code `2`

Exception:

- `--allow-remote` is passed

---

## 9.3 Third-party request blocking

Default:

- block all non-`baseUrl` origin HTTP/HTTPS requests

Allowed exceptions:

- `data:`
- `blob:`

If `--allow-third-party` is passed:

- allow non-baseUrl origin requests with `route.fetch()`

---

## 9.4 Fixture path jail

Fixture path rules:

- relative to scenario file directory
- no absolute paths
- no parent traversal
- resolved path must stay inside scenario file directory

Reject with:

```text
FIXTURE_PATH_FORBIDDEN
```

---

## 9.5 HTML escaping

Reporter must escape:

- scenario ids
- labels
- notes
- selectors
- URLs
- error messages
- hints
- metadata

Escape at least:

```text
&
<
>
"
'
```

Do not use raw innerHTML for dynamic values.

---

## 9.6 No shell command injection

Do not use shell interpolation.

Allowed style:

```ts
execFile(cmd, args)
```

Forbidden style:

```ts
exec(`${cmd} ${userInput}`)
```

---

## 9.7 Secret scanner

Scan:

- inline bodies
- fixture files

Warn on:

- `sk-`
- `ghp_`
- `AKIA`
- high-entropy strings longer than 40 characters

Default behavior:

- warning to stderr
- run continues

With `--strict-secrets`:

- exit `2`
- error code:

```text
SECRET_SCAN_FAILED
```

Never print the full secret.

---

## 9.8 Log hygiene

Logs may include:

- method
- path
- status
- timing
- scenario id
- viewport name

Logs must not include:

- response bodies
- fixture bodies
- inline bodies
- query-string values

---

# 10. Testing contract

## 10.1 Unit tests

Core must test:

- schema validation
- duplicate scenario ids
- duplicate viewport names
- invalid kebab-case
- broad pattern rejection
- cross-origin pattern rejection
- exit-code mapping
- card rendering
- JSON envelope rendering
- fixture path validation
- body serialization validation
- secret scanner warnings

Coverage:

- `packages/core` line coverage ≥ 90%

---

## 10.2 Runner integration tests

Use `examples/react-vite-demo`.

Test each mode:

- delay pass case
- delay fail case
- fixture pass case
- fixture fail case
- inline pass case
- inline fail case
- error pass case
- error fail case
- offline pass case
- offline fail case

Also test:

- selector timeout produces failure screenshot
- non-matching method passes through
- third-party request is blocked by default
- delayed request is aborted after capture
- no route remains unresolved
- repeated runs do not hang

---

## 10.3 CLI contract tests

CLI tests must spawn real process.

Test:

- valid run
- failed scenario
- bad flag
- missing file
- invalid JSON
- schema error
- non-loopback URL without `--allow-remote`
- app unreachable
- export missing artifact
- init existing file without `--force`

Snapshot normalization must replace:

- timestamps
- durations
- runId
- browser version
- absolute paths

---

## 10.4 Report tests

Test:

- report renders from `file://`
- images exist in `report/assets/`
- no external URLs in HTML
- axe scan has zero critical violations
- failure details are HTML-escaped

---

# 11. Coding-agent rules

The coding agent must obey these rules.

## 11.1 No guessing

If any behavior is not specified:

- stop
- ask for clarification
- do not invent UX, schema, flags, or exit behavior

---

## 11.2 Doc alignment

Whenever code changes behavior:

- update relevant docs in same PR
- update CLI snapshot tests
- update contract if contract itself must change

---

## 11.3 Package boundaries

Do not violate:

```text
cli -> core
cli -> playwright-runner
cli -> reporter-html
playwright-runner -> core
reporter-html -> core
```

Forbidden:

- anything depending on CLI
- runner importing CLI
- core importing runner
- core using Node-only APIs where avoidable
- core using Playwright

---

## 11.4 Output discipline

For `--reporter json`:

- exactly one JSON document on stdout
- no stdout chatter
- diagnostics on stderr

For human reporter:

- styled terminal output is allowed
- still no prompts
- still no spinners when piped

---

## 11.5 Error discipline

Never throw raw strings.

Use:

```ts
StateproofError
```

With:

```ts
code
message
hint
cause?
```

Every error hint must tell the user the next action.

---

## 11.6 Async discipline

- await every Playwright operation
- clean up browser/context/page in `finally`
- resolve every route
- no floating promises
- use watchdog timeouts for pending routes

---

## 11.7 Dependency discipline

Allowed runtime dependencies for Version 1:

- `commander` (CLI grammar)
- `zod` (Core validation)
- `picocolors` (Terminal colors)
- `playwright` (Browser runner)
- `picomatch` (Glob matching)
- `jsonc-parser` (Strict parsing error offsets)
- `@clack/prompts` (Interactive studio terminal prompts in CLI)
- `pixelmatch` (Pixel diffing in runner)
- `pngjs` (PNG decode/encode in runner)
- `@modelcontextprotocol/sdk` (MCP server bridge in @stateproof/mcp-server)

Any new dependency requires:

- explicit justification
- contract update

---

## 11.8 Filesystem discipline

Stateproof may write only to:

```text
artifacts/stateproof/
```

Plus `init` may write:

```text
stateproof.scenarios.json
fixtures/
.gitignore
```

Do not write elsewhere without explicit user command.

---

# 12. Definition of done for v0.1 implementation

A task is done only when:

- code works
- tests pass
- docs match contract
- no unresolved TODO behavior
- no guessed behavior
- exit codes verified
- JSON envelope verified
- report opens offline
- screenshots exist
- card exports correctly
- security rules are enforced
- no external network is required by tests
- CI passes on Ubuntu and Windows

---

# 13. Short instruction to give the coding agent

You can paste this directly:

```text
Read CODING_CONTRACT.md first. It overrides other planning docs until they are updated. Before implementing P1, update architecture.md, implementation-plan.md, userflow.md, design.md, and rules.md to match CODING_CONTRACT.md. Do not invent CLI flags, schema fields, exit behavior, response-mode behavior, report behavior, or security behavior. If anything is ambiguous, stop and ask. Implement only the frozen v0.1 scope in CODING_CONTRACT.md.
```