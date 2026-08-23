# Stateproof — Design System

> "Signal Foundry": a deep graphite runtime switchboard with off-white panels, one signal-lime proof accent, cobalt routes, monospace metadata, and bold technical display type. This document governs every Stateproof surface: CLI output, the HTML report directory, the companion panel (post-0.1), marketing site, and the Stateproof Card itself.

| Field | Value |
|---|---|
| Art direction | Signal Foundry (from launch post) |
| Accessibility floor | WCAG 2.1 AA (4.5:1 body text, 3:1 large text/UI), never color-only status (PRD NFR §9) |
| v0.1 status vocabulary | `PASS` · `FAIL` · `ERROR` only — WARN and SKIP are reserved, not emitted |
| Applies to | `reporter-html`, CLI ANSI styling, docs; companion panel + `apps/web` when built |

---

## 1. Design principles

| # | Principle | In practice |
|---|---|---|
| D1 | **Evidence is the hero** | Screenshots and status glyphs get maximum contrast and space; chrome stays quiet. |
| D2 | **One accent, one job** | Signal lime marks *proof* only (passes, capture actions, brand moments). Cobalt is reserved for navigation/links/routes. Nothing else glows. |
| D3 | **Machine-honest language** | UI says PASS / FAIL / CAPTURED / ASSERTED — never "success guaranteed" or "bug-free" (PRD §16). |
| D4 | **Terminal-native typography** | Metadata (ids, selectors, URLs, timestamps, durations) is always monospace; display type is bold and technical. |
| D5 | **Works in the dark and in CI** | Dark-first aesthetic; report must remain readable when screenshots are light-themed app captures — panels are off-white to host them. |
| D6 | **No decoration without function** | Thin 1px borders, sharp small radii, no gradients on controls. Every pixel either structures evidence or disappears. |

---

## 2. Color tokens

Dark graphite base (never pure black), elevation by lighter tiers, borders instead of shadows.

### Surfaces

| Token | Value | Use |
|---|---|---|
| `sp-bg` | `#111214` | Page background |
| `sp-surface-1` | `#17191C` | Panels, cards |
| `sp-surface-2` | `#1E2126` | Raised panels, inputs |
| `sp-panel-light` | `#F4F3EE` | Off-white screenshot-hosting panels (D5) |
| `sp-border` | `rgba(255,255,255,0.10)` | 1px hairlines |
| `sp-border-strong` | `rgba(255,255,255,0.22)` | Focus-adjacent, active outlines |

### Ink

| Token | Value | Contrast on `sp-bg` |
|---|---|---|
| `sp-text` | `#ECEDEA` | ~13:1 AAA |
| `sp-text-muted` | `#9BA1A6` | ~5.6:1 AA |
| `sp-text-faint` | `#6B7280` | meta only, ≥3:1 for large/mono labels |

### Signal colors

| Token | Value | Meaning | Notes |
|---|---|---|---|
| `sp-lime` | `#C8F04B` | PROOF: pass glyphs, capture button, brand mark | On dark: AAA for large text/glyphs; pair with dark ink `#1A2405` for filled buttons (~11:1) |
| `sp-cobalt` | `#4D8DFF` | ROUTES: links, navigation, selected route/request rows | ~5.2:1 on bg |
| `sp-red` | `#FF6B5E` | FAIL + ERROR statuses and failure text accents | ~5:1 on bg |
| `sp-amber` | `#FFC24D` | **Reserved** (WARN, pending runs) — not emitted anywhere in v0.1 | keep out of shipped UI |
| `sp-gray` | `#8A93A0` | **Reserved** (SKIP / not-configured states) — not emitted in v0.1; meta text may still use muted ink tokens | label required |

**Hard rules**

- Status is **never communicated by color alone**: every glyph ships with a text word (`PASS`, `FAIL`, `ERROR`) — terminal output uses the same words, never glyphs or color only.
- v0.1 emits exactly three statuses: PASS, FAIL, ERROR. WARN and SKIP are reserved vocabulary; adding them is a contract change.
- Lime is never used for links; cobalt is never used for pass/fail. Swapping these two is the canonical design bug.
- No other hues enter the system. Syntax highlighting inside report code blocks uses opacity steps of ink, not rainbow palettes.

---

## 3. Typography

| Role | Font | Weight / notes |
|---|---|---|
| Display | `"Space Grotesk", "Inter", system-ui` | 700, tight tracking (-0.02em); used for product name, page titles, big state words |
| Body | `"Inter", system-ui` | 400/500, 15–16px, line-height 1.55 |
| Mono metadata | `"JetBrains Mono", ui-monospace, "Cascadia Code", Consolas` | selectors, ids, URLs, methods, durations, versions — always lowercase-ish technical voice |

Scale (report & web): `12 · 13 · 14 · 16 · 20 · 28 · 40`. Display sizes use uppercase + letterspacing `0.02em` for the switchboard feel:

```text
STATEPROOF / FRONTEND RUNTIME VALIDATION      ← eyebrow, mono, faint
Account settings                               ← display 28–40
LOADING · EMPTY · ERROR · MOBILE              ← state strip, mono
```

**Font delivery rule:** CLI and HTML report must not fetch fonts from the network. Use local/system font stacks only (`ui-monospace`, `Cascadia Code`, `Consolas` fallbacks; system-ui for body). Marketing site may use self-hosted fonts later, but never the report or CLI.

---

## 4. Shape, spacing, iconography

- Radius scale: `sm 3px` (inputs, buttons), `md 6px` (cards), `lg 10px` (modals). Screenshot frames use `sm`.
- Spacing: 4px base grid (`4 · 8 · 12 · 16 · 24 · 32 · 48`).
- Borders over shadows: `1px solid sp-border`; a single soft shadow (`0 8px 24px rgba(0,0,0,.35)`) allowed only on floating layers (dialogs, popovers).
- Icons: minimal geometric set (play, refresh, camera, monitor, smartphone, cloud-off). If an icon can be a word, prefer the word — this UI leans typographic.
- Status glyph set (used identically in CLI, HTML, card). v0.1 emits only:
  - PASS → filled square with check, lime
  - FAIL → square with ×, red
  - ERROR → circle with !, red
  - WARN → triangle, amber — **reserved, not emitted in v0.1**
  - SKIP → dashed square, gray — **reserved, not emitted in v0.1**

---

## 5. Surface designs

### 5.1 CLI output

ANSI styling mirrors tokens; respects `NO_COLOR` and non-TTY detection (falls back to plain text words).

```text
STATEPROOF 0.1.0 — runtime validation            ← eyebrow line, faint

account-settings · 3 scenarios × 2 viewports     ← mono summary bar

PASS  account-loading  desktop  3.1s   [data-state='loading']
PASS  account-loading  mobile   2.9s   [data-state='loading']
FAIL  account-error    mobile   15.0s  selector timeout
      artifact artifacts/stateproof/account-settings/account-error.mobile.png
      hint    render a retry control below 420px

5 passed · 1 failed                              exit 1
```

Rules: data lines ≤ 100 chars; hints indented under their failure; no spinners when piped; progress = one updating line per scenario, never animated bars in CI.

### 5.2 HTML report (`report/`)

**Self-contained offline report directory**, not a single file:

```text
report/
  index.html      ← inline CSS only; no inline JavaScript
  assets/
    *.png         ← screenshots copied from the artifact directory
```

Page layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ STATEPROOF ▪ run account-settings          2026-08-23 14:02Z │  header: brand + meta strip (mono)
├──────────────────────────────────────────────────────────────┤
│ [state matrix table]  scenario × viewport cells = word+glyph │  the proof at a glance (PASS/FAIL/ERROR)
├──────────────────────────────────────────────────────────────┤
│ ┌ off-white panel ────────────┐  ┌ off-white panel ────────┐ │  screenshot gallery:
│ │ loading · desktop  1440×1024│  │ empty · mobile  390×844 │ │  frames on sp-panel-light,
│ │ [screenshot]                │  │ [screenshot]            │ │  captions mono underneath
│ └─────────────────────────────┘  └─────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ failure details: reason, selector, timeout, hint             │  only when failures exist
└──────────────────────────────────────────────────────────────┘
```

- Zero network requests (NFR): inline CSS only, screenshots referenced from `assets/`, no external fonts/CSS/images.
- **All dynamic strings HTML-escaped** — ids, labels, notes, selectors, URLs, messages, hints. No raw innerHTML for dynamic values.
- No inline JavaScript anywhere.
- Footer metadata: Stateproof version · browser version · runId · ISO timestamp · scenario-file name.
- Keyboard: matrix is a real `<table>`; each screenshot focusable with visible focus ring (`sp-border-strong` 2px).
- Prints cleanly (screenshots keep aspect ratio) so reviewers can export PDFs.

### 5.3 Companion panel (post-0.1)

**Not part of v0.1.** Design below is the target for the future R1.1 panel; nothing here may drive v0.1 scope.

A local web panel (served by the CLI, e.g. `localhost:51789`). Three zones, matching the golden path:

```text
┌ Routes ─────────────┐ ┌ State switchboard ────────────────────┐
│ GET /api/account ●3 │ │ [ LOADING ] [ EMPTY ] [ ERROR ]       │  big tactile toggles,
│ GET /api/user    ●1 │ │ [ OFFLINE ]        → RUN IN BROWSER   │  lime when armed
│                     │ └───────────────────────────────────────┘
├ Scenarios saved ────┤ ┌ Controlled browser preview ───────────┐
│ account-loading ✓   │ │                                       │
│ account-empty   ✎   │ │   (live iframe/screenshot of result)  │
│ + new from request  │ │   suggested selector chip:            │
└─────────────────────┘ │   [data-state='loading']  [use]       │
                        └───────────────────────────────────────┘
```

- Request rows: method badge (mono) + URL + hit count; click to arm interception.
- State buttons are the four verbs of the product; exactly one armed at a time.
- "Save draft" writes into `stateproof.scenarios.json` via the CLI core (never its own writer logic).
- Same tokens as report; panel width targets 360–480px docked beside the dev server.

### 5.4 Marketing site (`apps/web`, M0)

Hero follows the launch poster grammar:

```text
LET AGENTS BUILD FAST.
PROVE THE UI SURVIVES REAL STATES.

[ LOADING ] [ EMPTY ] [ ERROR ] [ MOBILE ]
04 STATES / 01 PROOF CARD
```

- Deep graphite field, off-white type, single lime underline sweep on the second line.
- One interactive demo module: a fake settings screen whose API the visitor can force into the four states; each run renders a live mini proof card.
- Docs pages: light-on-dark, max measure 72ch, mono for all code/config.

---

## 6. The Stateproof Card (canonical artifact)

The card *is* branded design in text form — it must look intentional pasted raw into GitHub. Format frozen by contract §8.6.

```markdown
## Stateproof Card — Account settings

| State   | desktop | mobile |
|---------|:-------:|:------:|
| Loading | PASS    | PASS   |
| Empty   | PASS    | PASS   |
| Error   | PASS    | FAIL   |

**Artifacts:** `artifacts/stateproof/account-settings/` — account-loading.desktop.png · account-loading.mobile.png · account-empty.desktop.png · account-empty.mobile.png · account-error.desktop.png · account-error.mobile.png

**Run:** local · Stateproof 0.1.0 · Chromium 141 · runId 01J9ZK... · 2026-08-23T14:02:15Z
```

Card rules:

- Title uses the scenario file `name` (or its human label).
- One row per scenario; viewport columns follow the configured viewport order.
- Cells contain only `PASS`, `FAIL`, or `ERROR` — never WARN, never SKIP, never color-only glyphs.
- Escape pipes in labels.
- Footer metadata line is mandatory (reproducibility NFR): surface, version, browser, runId, ISO timestamp.

---

## 7. Motion & feedback

- Durations: 120ms (hover/focus), 180ms (panel transitions). Nothing longer except the demo's simulated network delay.
- Easing: `ease-out` only.
- Run-in-progress affordance: pulsing lime dot next to the running scenario id (CSS animation, disabled under `prefers-reduced-motion`).
- No confetti, no success animations — evidence is serious; a completed run ends in stillness.

---

## 8. Accessibility checklist (every surface ships with)

- [ ] All text ≥ 4.5:1 against its background (verify lime-filled buttons use `#1A2405` ink)
- [ ] Status = color + word + shape (three redundant channels)
- [ ] Full keyboard reachability; visible 2px focus ring using `sp-border-strong` + lime inner keyline
- [ ] `prefers-reduced-motion` honored
- [ ] Screenshots have descriptive alt text ("Loading state, desktop viewport, settings form skeleton visible")
- [ ] Report tables have proper `<th scope>` headers
- [ ] Touch targets ≥ 44px in companion panel

---

## 9. Voice & microcopy

| Context | Write | Never write |
|---|---|---|
| Pass row | `PASS — captured at 1440px` | "Test successful!" |
| Fail hint | `hint: add [data-state='error'] to the error branch` | "Assertion failed :(" |
| Empty fixture guidance | "Empty responses are explicit fixtures — Stateproof never guesses your empty shape." | anything implying auto-detection |
| Privacy note | "Screenshots stay in ./artifacts until you share them." | "Your data is safe with us." |
| Brand tagline | "Let agents build fast. Prove the UI survives real states." | variations that promise correctness |

Tone: flat, technical, confident. Lowercase for technical identifiers, sentence case for prose, uppercase reserved for display moments and state words.
