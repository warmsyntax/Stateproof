# Stateproof — Rules

> Non-negotiable working agreements for anyone - human or agent - contributing to this repository. If a rule blocks a legitimate need, change the rule in a PR first; never silently work around it.

| Field | Value |
|---|---|
| Scope | All packages under `packages/*`, `apps/*`, `examples/*` |
| Enforcement | Biome + CI gates + review checklist (§9) |
| Related docs | `architecture.md`, `userflow.md`, `design.md`, PRD |

---

## 1. Product rules

1. **R1 — Privacy is the default.** No network calls from Stateproof code except to the configured `baseUrl` inside the controlled browser. No telemetry, no crash uploads, no analytics. Any future outbound request requires explicit opt-in plus documentation.
2. **R2 — Interception stays in our browser context.** Never modify the user's app code, dev server, hosts file, system proxy, or production API. All simulation happens through Playwright route interception in contexts we own.
3. **R3 — Localhost guardrail.** Non-loopback `baseUrl` triggers a warning; execution against production-like URLs requires `--allow-remote`. This check cannot be skipped silently.
4. **R4 — Honest language.** Product copy says captured / assertion passed. It never claims fully tested, bug-free, or guaranteed (PRD §16).
5. **R5 — No guessing empty shapes.** Empty responses come from explicit fixtures or inline bodies only; the tool never invents what an API returns when data is absent.
6. **R6 — Stay narrow.** New feature ideas that smell like test frameworks, dashboards, AI review, or cloud browsers go to the backlog with a milestone tag (R2+). R1 rejects scope creep by default.

## 2. Repository & workflow rules

- **Branches:** `main` is protected; work happens on `feat/<scope>`, `fix/<scope>`, `docs/<scope>` short-lived branches.
- **Commits:** Conventional Commits (`feat(runner): offline mode for scenario contexts`). Subject <= 72 chars, imperative mood. A commit must build, lint, and pass tests.
- **PRs:** Small and single-purpose. Every PR includes: what changed, why, how it was verified (test names or manual steps), and screenshots for any visual surface change.
- **No direct pushes to `main`.** CI on `main` runs the full matrix (lint, typecheck, unit, e2e smoke).
- **Generated files** (`schema/v1.json`) are regenerated in CI and must match the committed output - drift fails the build.
- **Secrets:** never committed; fixtures use placeholder data. The secret scanner (§6) guards inline bodies and fixture files.

## 3. Code style rules

- TypeScript strict mode everywhere: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, no `any` except in narrowly-scoped interop with a `// eslint-disable` style justification comment naming the ticket.
- ESM only. Node >= 20. No default exports from library packages; named exports keep tree-shaking honest.
- Public package APIs are declared in `package.json` `exports`; importing another workspace package's internals fails review even if the build allows it.
- Errors: throw typed `StateproofError { code, message, hint, cause? }` from core/runner/cli layers. Never throw raw strings. Never swallow errors - every catch either recovers with a logged reason or rethrows enriched.
- Async discipline: every Playwright interaction awaited; cleanup in `finally`; no floating promises (Biome rule enforced).
- No comments explaining obvious code; comments explain *why* (product intent, interception gotcha, perf note) or nothing.
- File naming: kebab-case (`request-matcher.ts`); types PascalCase; scenario ids kebab-case per schema.
- Dependency budget: each package lists deps explicitly; adding any new runtime dependency requires a one-line justification in the PR body (bundle and install time are product features for a CLI). The v0.1 runtime dependency set is frozen by contract §11.7: `commander`, `zod`, `picocolors`, `playwright`, `picomatch`, `jsonc-parser` — anything else needs a contract change.

## 4. Testing rules

| Layer | Tool | Gate |
|---|---|---|
| Pure units (matcher, schema, exit codes, card renderer) | Vitest | >= 90% lines in `packages/core`; every FailureCode covered |
| Runner integration | Vitest + Playwright against `examples/react-vite-demo` | delay, fixture, error, offline modes each have a passing + failing fixture |
| CLI contract | Snapshot of stdout JSON envelope + exit codes for: valid run, failed scenario, bad flag, missing file | envelope shape changes require version bump discussion |
| Report | Smoke render + a11y axe scan | zero critical violations |

- Bug fixes ship with the regression test that reproduces the bug, in the same PR.
- No test may depend on external network. Flaky = broken: a test that fails twice in CI gets quarantined with an issue link within 24h, fixed or deleted within a week.
- Screenshots produced by tests go to temp dirs, never committed. Baseline visual diffing is out of v0.1 scope entirely (contract §3.2).

## 5. Agent-contribution rules (for AI-assisted development)

These govern coding agents working *on* Stateproof:

1. Read `architecture.md` §4 before touching package boundaries; do not create cross-package imports beyond the declared graph.
2. Run `pnpm lint && pnpm typecheck && pnpm test` before declaring done; paste summary counts in the final response, not vibes.
3. When a task touches the CLI output contract (envelope, exit codes, flags), update `userflow.md` §5 and the CLI snapshot tests together - the contract is versioned.
4. Never add prompts, spinners-on-pipes, or stdout chatter to the programmatic path.
5. Prefer deleting code over configuring around it; if a change adds a third conditional for one quirk, propose a rule/model change instead.
6. Do not bump major dependencies or change lockfile strategy without an explicit request.

## 6. Security rules (aligned with contract.md §9)

- Threat-model reviews required for: anything touching the filesystem outside `artifacts/stateproof/`, anything reading env vars, any future server component.
- **Log hygiene:** logs may include method, path, status, timing, scenario id, viewport name. Logs must never include response bodies, fixture bodies, inline bodies, or query-string values — query-string values are always redacted.
- **Secret scanner:** warn on `sk-`, `ghp_`, `AKIA`, and high-entropy strings longer than 40 characters in inline bodies and fixture files. Warnings go to stderr and the run continues by default; with `--strict-secrets` the run exits 2 with `SECRET_SCAN_FAILED`. Never print the full secret. (No `.stateproofignore` in v0.1 — that mechanism does not exist.)
- **Fixture path jail:** fixture paths are relative to the scenario file and jailed to the scenario file directory. Absolute paths and parent-directory traversal are rejected (`FIXTURE_PATH_FORBIDDEN`). Fixtures must exist, be ≤ 1 MB, and `.json` fixtures must parse.
- **HTML escaping:** all dynamic strings in HTML reports are escaped (`& < > " '`). The reporter must not inject raw user-controlled HTML and uses no inline JavaScript.
- **No shell injection:** Stateproof must not spawn commands through a shell with interpolated user input. Argument-array APIs only (`execFile(cmd, args)` style); string-interpolated `exec()` is forbidden.
- **Third-party request blocking:** in the controlled browser, requests whose origin is not the `baseUrl` origin are blocked by default unless `--allow-third-party` is passed (`data:` and `blob:` always allowed).
- **Filesystem discipline:** Stateproof writes only to `artifacts/stateproof/`, plus the files `init` creates (`stateproof.scenarios.json`, `fixtures/`, `.gitignore` entries).
- GitHub Action (post-0.1): `contents: read` permission floor; pinned action versions; no `pull_request_target` usage; artifacts get short retention defaults.
- Future MCP server exposes named scenarios only - no generic fetch interception, no shell passthrough (PRD §12).

## 6.1 Output discipline

- With `--reporter json`: stdout contains exactly one JSON document. No chatter on stdout; diagnostics go to stderr.
- The human reporter may print styled output to stdout. Diagnostics still go to stderr. Never prompts; never spinners when piped; always respect `NO_COLOR`.

## 7. Documentation rules

- Docs live next to code they describe; `README.md` per package covers install/use/dev in < 100 lines.
- Behavior changes update the relevant planning doc (`userflow.md`, `design.md`, `architecture.md`) in the same PR - stale docs are bugs.
- All user-facing strings (help text, errors, hints) live in the package that prints them and are covered by snapshot tests, because agents parse them.
- Changelog entries per release via Changesets once publishing starts (M2+).

## 8. Definition of done (any task)

- [ ] Code + tests written; suite green locally
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass
- [ ] Docs updated when behavior or contracts changed
- [ ] No new runtime dependency without justification
- [ ] For UI surfaces: keyboard walkthrough + contrast check done
- [ ] For CLI changes: exit codes and JSON envelope verified via snapshots
- [ ] PR description states verification evidence (per §2)

## 9. Review checklist (reviewer affirms each)

- [ ] Package boundaries respected (imports match architecture §3.1 graph)
- [ ] No privacy/security rule (§1, §6) weakened
- [ ] Error paths produce hints a stranger could act on
- [ ] Design tokens used; no invented colors or fonts (design.md §2–3)
- [ ] Test coverage added for both success and failure paths
