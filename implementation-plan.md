# Stateproof — Implementation Plan

> Phased execution plan turning the PRD into shippable increments. Each phase ends in a verifiable state; no phase starts until the previous exit gate passes. Maps to PRD milestones M1–M4 (v0.1 scope = Phases 0–5).

| Field | Value |
|---|---|
| Target | Stateproof 0.1 (PRD §18 + contract.md §12 definition of done) |
| Stack skills loaded | `playwright-cli` (MS), `playwright-best-practices`, `typescript-advanced-types` |
| Governing docs | **`contract.md` (binding spec)**, `architecture.md`, `userflow.md`, `design.md`, `rules.md` |
| Working cadence | One phase per working session where possible; commit at every green gate |

---

## Phase overview

```text
P0 Foundations        ▓▓░░░░░░░░  repo scaffold + toolchain
P0.5 Contract freeze  ░▓░░░░░░░░  docs aligned to contract.md — no schema work before this
P1 Core domain        ░░▓▓░░░░░░  strict schema · matcher · result model · md/json card renderer
P2 Runner engine      ░░░▓▓░░░░░  catch-all interception · hold-and-abort delay · capture
P3 CLI                ░░░░▓▓░░░░  exact flag grammar · agent contract · guardrails
P4 Reports            ░░░░░▓▓░░░  offline report directory · escaped HTML · md/json cards wired
P5 Golden-path proof  ░░░░░░▓▓░░  example app + E2E + contract §12 verification → v0.1
─── v0.1 ships ─────────────────
P6 GitHub Action      later       R2 / M4
P7 Companion + MCP    later       post-0.1 / M3·M5
```

---

## P0 — Foundations

**Goal:** Empty monorepo that builds, lints, typechecks, tests, and runs in CI.

- [ ] `git init`, root `package.json` (private), `.gitignore` (artifacts/, node_modules, dist)
- [ ] `pnpm-workspace.yaml` (`packages/*`, `apps/*`, `examples/*`)
- [ ] `tsconfig.base.json`: strict, NodeNext, composite-ready; solution-style root `tsconfig.json`
- [ ] Biome config (lint + format, single root file)
- [ ] Package skeletons: `core`, `playwright-runner`, `cli` (each: package.json w/ exports, tsconfig, src/index.ts, vitest)
- [ ] Root scripts: `build` (`tsc -b`), `lint`, `typecheck`, `test`
- [ ] GitHub Actions CI runs exactly, on **Ubuntu and Windows**:
  ```bash
  pnpm install
  pnpm -r build
  pnpm lint
  pnpm typecheck
  pnpm test
  pnpm exec playwright install chromium
  ```

**Exit gate:** all checks green on a fresh clone; `pnpm -r build` produces empty dists.

## P0.5 — Contract freeze

**Goal:** Zero contradictions between planning docs and `contract.md` before any schema/CLI code exists.

- [x] Update `architecture.md`, `implementation-plan.md`, `userflow.md`, `design.md`, `rules.md` to match contract §2
- [ ] Cross-doc consistency sweep (types, flags, exit codes, statuses, artifact layout)
- [ ] Commit the doc updates

**Exit gate:** no unresolved contract contradictions. No P1 work starts until this gate passes.

## P1 — Core domain (`@stateproof/core`)

**Goal:** Pure logic complete and unit-tested — no Node/browser deps. Markdown + JSON card rendering only; no terminal renderer in core.

- [x] Strict JSON scenario parsing: UTF-8, no comments, no trailing commas, no JSON5/JSONC for user files; **location-aware syntax errors** (file/line) via offset-based parser (`jsonc-parser` parse errors)
- [x] Zod schemas matching contract §4 exactly: optional `viewports`, `expect.visible: string | string[]`, `stableMs`, `$comment`; strict (no additional properties)
- [x] Schema errors use **JSON path + hint** format; exact error-code registry from contract §7.5
- [x] Validation before browser launch for: duplicate scenario ids, duplicate viewport names, kebab-case ids/names/viewport names (`^[a-z0-9]+(-[a-z0-9]+)*$`), overly broad patterns (`*`, `**`, `**/*`, `**/**`, all-wildcard segments), cross-origin patterns, fixture path traversal/jail, fixture size ≤ 1 MB, `.json` fixture validity, body serializability (no functions/symbols/undefined/BigInt; ≤ 1 MB serialized), viewport ranges 320–3840 integer
- [x] Build-time `z.toJSONSchema()` script → committed `schema/v1.json` (+ drift check)
- [x] Request matcher: method + pathname glob match (query strings ignored), pure function, table-driven tests
- [x] Exit-code mapper with contract §7.3 precedence (4 > 3 > 2 > 1 > 0) incl. partial-result rule
- [x] Exact `RunResult` with `runId`; exact frozen `FailureCode` list (16 values, nothing else)
- [x] Card renderers: **Markdown + JSON envelope only** (contract §8.6/§8.7 formats; escape pipes in labels; PASS/FAIL/ERROR only)
- [x] Fixture secret scanner: warn by default; fail with `SECRET_SCAN_FAILED` under `--strict-secrets`
- [x] Vitest coverage ≥ 90% lines (measured: 93.9%)

**Exit gate:** contract §10.1 unit-test list fully green (schema validation, duplicates, kebab-case, broad/cross-origin pattern rejection, exit-code mapping, card rendering, envelope rendering, fixture path validation, body serialization validation, secret scanner warnings). ✅ 79/79 tests.

## P2 — Runner engine (`@stateproof/playwright-runner`)

**Goal:** Execute one scenario×viewport against a live local app using the contract §6 runner behavior.

- [ ] Browser lifecycle: Chromium launched once per run, headless default; fresh context per scenario×viewport (`serviceWorkers: "block"`, locale `en-US`, timezoneId `UTC`, viewport/dsf/isMobile from config; `ignoreHTTPSErrors` only for HTTPS loopback)
- [ ] **One catch-all route handler**, registered before goto; every request resolved (fulfill / abort / `route.fetch()`); handler errors abort safely; never leave a route pending
- [ ] Navigation URL = `new URL(route, baseUrl)`; `waitUntil: "domcontentloaded"` (never `load`)
- [ ] Request classification: `data:`/`blob:` pass; third-party origin ⇒ abort `"blockedbyclient"` unless `--allow-third-party` (`route.fetch()`); matched method+pathname ⇒ response rule; else passthrough. Query strings ignored; method exact match
- [ ] `delay`: hold first matching request pending during capture, then abort `"aborted"`; later matches abort immediately; no interception before timeout ⇒ `request-not-intercepted`. **No real-response passthrough**
- [ ] `offline`: abort matched requests `"internetdisconnected"` at request level — never `context.setOffline(true)`
- [ ] `fixture`/`inline`/`error`: fulfill with correct status/headers/Content-Type defaults per contract §6.4
- [ ] Selector waiting: all selectors visible (array support); `stableMs` continuous-visibility wait with restart on hide; scroll first selector into view; **viewport-only screenshot** (never fullPage)
- [ ] Failure capture: failure screenshot with same semantic filename; exact failureCodes (`selector-timeout`, `selector-unstable`, `navigation-failed`, `capture-failed`); unexpected crash ⇒ status `error` + `trace.md` written if possible
- [ ] Artifact lockfile `.lock` acquisition (`ARTIFACT_LOCKED` exit 2 if present); stale generated-file cleanup before run; lock removed in `finally`
- [ ] `runId` generated once per run; global scenario watchdog so repeated runs never hang; zero unresolved routes across the suite
- [ ] Integration tests vs `examples/react-vite-demo` covering contract §10.2: delay/fixture/inline/error/offline pass+fail cases, selector-timeout failure screenshot, non-matching method passthrough, third-party blocked by default, delayed request aborted after capture

**Exit gate:** contract §10.2 list green; zero hangs across 50 consecutive runs.

## P3 — CLI (`@stateproof/cli`)

**Goal:** The exact flag grammar and agent contract from contract §5.

- [ ] Commander wiring: `init` · `run` · `list` · `export` with **only** the contract flags (`--file`, `--url`, `--route`, `--force`, `--scenario`, `--viewport`, `--timeout-ms`, `--allow-remote`, `--allow-third-party`, `--strict-secrets`, `--reporter`, `--run`, `--format`)
- [ ] Positional resolution rules implemented verbatim (contract §5.2); unknown scenario ids / zero selected runs ⇒ exit 2
- [ ] Precedence: `--url` > file `baseUrl`; `expect.timeoutMs` > `--timeout-ms` > 15000
- [ ] `init`: no reachability check, no browser launch; refuses overwrite without `--force`; scaffolds **strict JSON with `$comment` and `note` fields only**; creates fixtures dir + artifacts gitignore entry
- [ ] `run`: reachability check (10 s budget ⇒ exit 3 `APP_UNREACHABLE`); loopback guardrail incl. DNS resolution of hostnames; redirect guardrail (`NON_LOOPBACK_REDIRECT`)
- [ ] stdout/stderr discipline: `--reporter json` = one JSON document on stdout; human reporter styled output allowed on stdout; diagnostics always stderr; NO_COLOR respected; no prompts; no spinners when piped
- [ ] Envelope types `init.result`/`list.result`/`run.result`/`export.card`/`error`; `ok: true` only on exit 0; partial results + error on fatal mid-run
- [ ] Exact machine error codes table (contract §7.5) wired to exits; every hint names the next action
- [ ] Human terminal output per design.md §5.1 (picocolors); statuses printed as words PASS/FAIL/ERROR
- [ ] `export`: `--run` resolution chain per contract (explicit → file name → single-dir fallback → exit 2 asking for `--run`)
- [ ] CLI contract tests spawn real processes; snapshot normalization replaces timestamps, durations, runId, browser version, absolute paths (contract §10.3)

**Exit gate:** black-box CLI suite green on Windows + ubuntu; agents can drive run→parse→retry using JSON only.

## P4 — Reports (`@stateproof/reporter-html`)

**Goal:** Evidence humans open and trust, fully offline, injection-proof.

- [ ] **Report is a directory**: `report/index.html` + screenshots copied into `report/assets/*.png`
- [ ] Works from `file://`; zero network requests; inline CSS only; **no inline JavaScript**; no external fonts/CSS/images
- [ ] **All dynamic strings HTML-escaped** (ids, labels, notes, selectors, URLs, messages, hints, metadata); no raw innerHTML
- [ ] State matrix table (scenario × viewport, word + glyph), screenshot gallery, failure details block
- [ ] Footer metadata: Stateproof version, browser version, runId, ISO timestamp, scenario file name
- [ ] Statuses limited to PASS / FAIL / ERROR (no WARN/SKIP anywhere in v0.1 output)
- [ ] A11y: axe scan zero critical violations, keyboard navigable, proper `<th scope>`, alt text per screenshot
- [ ] Report tests per contract §10.4 (file:// render, assets exist, no external URLs, escaping verified)

**Exit gate:** report opens from `file://` with networking disabled; design checklist §8 all checked.

## P5 — Golden-path proof → **v0.1**

**Goal:** Contract §12 definition of done demonstrated, not assumed.

- [ ] Flesh out `examples/react-vite-demo`: settings screen with deterministic state branches, **no external network, no external fonts**; stable selectors `[data-state='loading']`, `[data-state='empty']`, `[data-state='error']`, `[data-state='offline']`, `[data-testid='retry']`; mobile bug toggle hides retry control under 420px; loading proven via delay mode; offline proven via request-level abort
- [ ] Scripted demo: setup → `init` → scenarios × viewports → intentional failure → fix → rerun green → paste card
- [ ] Full E2E in CI runs the scripted demo headlessly on Ubuntu + Windows
- [ ] Performance budgets verified: start ≤ 10 s, default timeout 15 s (NFR §9)
- [ ] Docs sweep: READMEs per package, planning docs updated to "as-built" state
- [ ] Tag `v0.1.0`

**Exit gate:** every checkbox in contract §12 true (exit codes verified, JSON envelope verified, report opens offline, screenshots exist, card exports correctly, security rules enforced, no external network required by tests, CI green both OS).

---

## Later phases (post-0.1, not started until P5 ships)

### P6 — GitHub Action (R2 / M4)
JS action wrapping CLI: inputs base-url/scenario-file/scenarios; wait-for-preview; run `--reporter json`; upload-artifact@v4+ unique names, retention-days ≤ 14; GITHUB_STEP_SUMMARY table (userflow §6). Gate: sample repo posts evidence from CI; action works with `contents: read` only.

### P7 — Companion panel prototype (R1.1 / M3)
Local web panel served by CLI (routes observed via CDP/page events, four-state switchboard, save-draft writes through core). Design per design.md §5.3. Gate: scenario created without hand-editing JSON (FR-03).

### P8 — Agent bridge (M5)
Thin MCP server exposing `stateproof_run` / `stateproof_list`, calling CLI core only. Redaction selectors ship here (M3 scope folded). Gate: an agent completes fix-loop using MCP only.

### P9 — Optional cloud sync (M6)
Opt-in artifact upload (Cloudflare R2/D1), share links, retention. Explicitly blocked until local value proven (PRD NG-05).

---

## Risk watchlist during execution

| Risk | Trigger to watch | Pre-agreed response |
|---|---|---|
| Playwright route misses requests | SW or late registration in testing | Re-check P2 rules 1–2; consult `playwright-best-practices` skill |
| Windows path/glob inconsistencies | P3 black-box tests on win32 | Use `pathe`-style normalization; no hand-rolled path math |
| Snapshot churn | Frequent card/copy edits | Snapshots own copy changes; update intentionally, note in PR |
| Scope creep into framework territory | Any "while we're here" test-runner idea | Rule R6 — backlog it, keep shipping the narrow tool |

## Session workflow (every coding session)

1. Load relevant skill before touching its layer (`playwright-*` for P2/P6, TS skill throughout)
2. Pick the top unchecked box of the current phase only
3. Green gate before switching context; commit with conventional message
4. Update phase checkboxes in this file as work completes
