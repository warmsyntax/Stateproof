# Stateproof — Design System
**"Color Ledger / Runtime Atlas"** — an editorial operations manual for runtime proof: mineral-paper explanation fields, a navy control room, cobalt action, teal trust, coral attention, and one chartreuse proof mark.

| Field | Value |
|---|---|
| Status | Active |
| Scope | **v1 landing page** (`apps/web`, marketing + first-run invitation) |
| Supersedes | Signal Foundry art direction for the marketing surface only |
| Governing docs | `contract.md`, `rules.md` (§R4 honest language, §R1 privacy), `architecture.md` §4.3 (CLI contract) |
| Accessibility floor | WCAG 2.1 AA; status always word + color + shape, never color-only |
| Status vocabulary | `PASS` · `FAIL` · `ERROR` only. WARN/SKIP never appear anywhere on the page |

---

## 1. Thesis

Stateproof is a runtime proof system, not a testing framework. The page must read like a **printed operations manual**: calm, physical, measurable. Every section is one colored sheet in a ledger, and each sheet communicates exactly one idea.

**Brand essence:** precise runtime proof for developers who build fast but want visible evidence before they ship.

**Voice:** concise, factual, constructive. Says "Error state not captured yet", never "Your UI is broken". Names the next action; never overclaims.

**The one sentence the page must prove:**
> Choose a request. Force a state. Capture proof.

### What the page may claim (v1 truth — verified against contract)

| Allowed (true in v1) | Forbidden |
|---|---|
| Forces loading / empty / error / offline states in a controlled Chromium | "bug-free", "fully tested", "guaranteed", "success" |
| No app instrumentation, no MSW, no proxy — interception lives in a browser we launch | Any promise of correctness |
| PASS / FAIL / ERROR card + offline HTML report (opens from `file://`) | WARN/SKIP vocabulary |
| JSON envelope + exit codes 0–4 for agents and CI | Terminal Studio / TUI as shipped |
| Loopback guardrail by default; `--allow-remote` is explicit | MCP server as shipped |
| No telemetry, nothing leaves disk unless you share it | Visual diff / baselines as shipped |
| Commands: `init` · `run` · `list` · `export` | Invented flags or modes |

Response modes exist exactly five: `delay`, `fixture`, `inline`, `error`, `offline`. States shown to visitors are the four user-facing ones: loading, empty, error, offline. Default viewports: `desktop 1440×1024`, `mobile 390×844` (order matters).

If a roadmap line is desired at all, one mono line only: `next: terminal studio · agent bridge — post-v1`. Never styled as a feature.

---

## 2. Color system

### 2.1 Tokens with shade ramps (shade = depth)

Depth is made with **shades of the same hue plus hard seams** — never gradients, never blur, never glass. Each field color ships a ramp: `deep` (recessed / pressed), base (field), `raise` (lifted panels), `seam` (hairlines on dark fields).

```css
:root{
  /* Paper & ink */
  --mineral:#F4F0E5;   --mineral-hi:#FAF7EF;  --mineral-lo:#EAE3D2;
  --mist:#DFD9CA;
  --ink:#101925;       --ink-70:rgba(16,25,37,.7); --ink-45:rgba(16,25,37,.45);
  --ink-12:rgba(16,25,37,.12);
  --ink-muted:#46535F;                     /* supporting prose on mineral */

  /* Console (navy) */
  --navy:#15233A;      --navy-deep:#0E1728; --navy-raise:#1D3050;
  --navy-seam:rgba(244,240,229,.14);

  /* Action (cobalt) */
  --cobalt:#2D6BF3;    --cobalt-deep:#1F4FC4; --cobalt-press:#1A41A6;
  --cobalt-tint:rgba(45,107,243,.10);

  /* Trust (teal) */
  --teal:#0D4E50;      --teal-deep:#093B3D; --teal-raise:#126265;
  --teal-seam:rgba(244,240,229,.14);

  /* Attention (coral) */
  --coral:#E85B3C;     --coral-deep:#C4472B; --coral-tint:rgba(232,91,60,.10);

  /* Proof (chartreuse) — one job only */
  --chartreuse:#CDEA4F; --chartreuse-deep:#B7D63A;
  --chartreuse-tint:rgba(205,234,79,.16);

  /* Motion / shape */
  --ease:cubic-bezier(.2,.6,.2,1);
  --t-fast:120ms; --t-base:160ms; --t-slow:220ms;
  --radius:2px;                        /* hard edges; 2px is the maximum */
}
```

### 2.2 Allocation (color carries structure)

| Field | Color | Meaning |
|---|---|---|
| Explanation, long-form, hero | mineral | calm review — evidence is read on paper |
| Proof mechanism, console, demo | navy | the control room where interception happens |
| Workflow strip, primary action | cobalt | the request in motion; the action you take |
| Privacy / local-first | teal | stable, grounded trust |
| Error & risk detail | coral | attention, only when content warrants it |
| Captured evidence | chartreuse | proof mark — stamps, PASS glyphs, capture button. **Never fills large areas** |
| Structure, typography | ink | rules, borders, type |

Rules:
- Chartreuse is a stamp, not a surface. Maximum footprint per viewport: one button or a handful of small marks.
- Coral appears only in rows/panels whose content is actually failing or corrective.
- Cobalt is never used for PASS/FAIL; chartreuse is never used for links. Swapping these is the canonical design bug.
- Section identity is the background color itself. Do not collapse sections into one neutral scroll.

### 2.3 Contrast ledger (verified, WCAG relative luminance)

| Pair | Ratio | Verdict | Use |
|---|---|---|---|
| ink on mineral | 15.5:1 | AAA | headings, body on paper |
| ink-muted on mineral | 6.9:1 | AA | supporting prose |
| **cobalt-deep** on mineral | 6.2:1 | AA | links on light fields |
| cobalt (#2D6BF3) on mineral | 4.1:1 | ✗ fails text | fills/decoration on light only |
| white on navy | 15.8:1 | AAA | console headings |
| mist on navy | 11.2:1 | AAA | console body |
| chartreuse on navy | 11.6:1 | AAA | proof glyphs, PASS word |
| coral on navy | 4.5:1 | AA | FAIL word on console |
| cobalt on navy | 3.4:1 | large/UI only | route lines, active route rows |
| ink on chartreuse | 13.1:1 | AAA | capture buttons, stamps |
| ink on coral | 5.1:1 | AA | error buttons (never white text on coral) |
| white on cobalt | 4.7:1 | AA | primary buttons on the strip |
| ink on cobalt | 5.7:1 | AA | alt button ink on strip |

Implementation must re-verify these with a contrast checker; ratios above are computed targets, not a waiver.

---

## 3. Typography

### 3.1 Roles & allocation (80 / 15 / 5)

| Share | Font | Weights | Carries |
|---|---|---|---|
| ~80% | **Space Grotesk** | 400 · 500 · 700 | headlines, reading copy, CTA labels — both persuasion and explanation |
| ~15% | **Silkscreen** (pixel) | 400 | state labels, counters `01–04`, CAPTURED stamps, field IDs, ticker, small wordmark accents |
| ~5% | **IBM Plex Mono** | 400 · 500 | URLs, selectors, commands, JSON, durations, timestamps, viewport dimensions, exit codes |

Only these three families. Loading a fourth (separate body font) is rejected for payload reasons — Space Grotesk 400 at 16–17px / 1.6 is the reading face.

**Pixel type is a measurement system, not a theme:**
- 9–13px only, always UPPERCASE, letter-spacing .04–.08em.
- Never body paragraphs, never buttons with long labels, never above 14px.
- Legibility test: if a pixel label needs zooming on a 360px screen, it is too small or too long.

**Mono is the technical voice:** lowercase-ish identifiers (`[data-state='loading']`, `exit 1`, `3.1s`, `runId 01J9ZK…`). Mono never shouts; it annotates.

### 3.2 Scale & placement

Scale: `13 · 15 · 17 · 20 · 26 · 34 · 48 · 72` (clamp for fluid steps).

- Display: 700, tight tracking `-0.02em`, sentence-case prose / UPPERCASE reserved for display moments and state words.
- Max measure: **65–70ch** prose, **72ch** docs-like blocks.
- Captions: mono 12–13px, ink-45 on light / mist on dark, sit tight under artifacts (4–8px).
- **Dynamic placement for the "ahh" moments** (max one per viewport, §10):
  1. Hero: oversized claim set asymmetrically; the proof artifact floats off-grid to the right, slightly overlapping the next field's seam.
  2. One giant background state word per console field (`ERROR`, `OFFLINE`) at 3–4% opacity, pixel or display face, cropped by the field edge — depth cue, zero noise.
  3. Pixel field IDs (`01`–`07`) pinned at the top-left rule of every section, like a ledger tab.
  4. Captions occasionally *hand-set* outside the grid margin (an annotation that says a human placed it) — at most twice on the whole page.

### 3.3 Font delivery (performance-critical)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<!-- Space Grotesk 400;500;700 · Silkscreen 400 · IBM Plex Mono 400;500 · display=swap · latin subset -->
```

- `font-display: swap`; define explicit sizes/line-heights so swap causes no layout shift (CLS ≤ 0.05).
- Fallback stacks must hold metrics reasonably: `Space Grotesk → system-ui`, `Silkscreen → ui-monospace`, `IBM Plex Mono → ui-monospace, Consolas`.
- Total font payload target ≤ 130KB woff2. If a weight is unused, cut it.

---

## 4. Layout paradigm — stacked editorial fields

Not a centered card grid. The page is a bound ledger; each sheet is full-bleed color with an inner grid.

```
00 NAV          ink rule on mineral           wordmark · anchors · GitHub
01 MINERAL HERO explain the promise           claim + one-line command + proof artifact
02 NAVY LEDGER  show the proof mechanism      the four state rows (core motif)
03 COBALT STRIP show the workflow             init → run → prove (3 steps)
04 MINERAL WORK explain the experience        editorial prose + card artifact
05 NAVY DEMO    let the visitor force states  interactive switchboard + preview
06 TEAL TRUST   explain privacy/local-first   guardrails list
07 INK CLOSING  invite the first proof run    install + GitHub + honest sign-off
```

### Grid & rhythm

- 12-column grid, max-width **1200px**, gutters 24px, page margins `clamp(20px, 5vw, 64px)`.
- Base spacing 8px: `4·8·12·16·24·32·48·96`. Section padding `clamp(96px, 12vh, 160px)` — whitespace is evidence.
- Asymmetry default: text **7 cols / artifact 5 cols**, artifact offset ½–1 col past center (Tschichold proportion). Mirror the asymmetry between consecutive fields so the page has a spine but no monotony.
- **One primary claim per field.** If a field needs two ideas, split the field.
- Rules/dividers: 1–2px ink or contrast seams. A thick seam (3–4px) only at major transitions (mineral→navy, navy→cobalt).
- No container shadows except the single offset-plane pattern (§5).

---

## 5. Depth & physicality (proof feels physical)

Techniques, in order of preference:

1. **Seams** — 1px ink/contrast rules; ledger rows separated by hairlines.
2. **Offset planes** — paper-sheet depth via hard offset, no blur:
   ```css
   .sheet{ box-shadow: 6px 6px 0 var(--ink); }         /* on mineral */
   .sheet--navy{ box-shadow: 6px 6px 0 var(--navy-deep); }
   .sheet:hover{ transform: translate(-2px,-2px); box-shadow: 8px 8px 0 …; }
   .sheet:active{ transform: translate(2px,2px); box-shadow: 2px 2px 0 …; }
   ```
3. **Shade steps** — recessed areas use `--*-deep`, raised panels use `--*-raise` (e.g., JSON block on `--navy-deep` inside a navy field).
4. **Square checkboxes / toggle marks** — armed state gets a 3px ink offset frame or a chartreuse capture mark (✓-free: a filled square).

Forbidden depth: blur, glassmorphism, drop-shadow fog, gradient fills on controls, floating cards with soft shadows (offset planes only).

---

## 6. Background & texture

Keep backgrounds **cheap and mostly static**; motion in backgrounds is rationed (§10.3).

- **Mineral fields:** faint measurement grid — 1px ink dots at 2–3% alpha on a 32px grid, or ledger hairlines every 96px at 3% alpha. Static. Optional giant cropped state word at 3–4% alpha (§3.2).
- **Navy fields:** instrument bezel — tick marks along top/bottom edges (2px × 8px, mist 30%), corner registration marks (`+`), and the field's giant ghost word. Grid dots 3–4% alpha.
- **Teal / cobalt fields:** flat color + seams only. No texture.
- **Texture is CSS-only** (repeating gradients). No image noise, no SVG blobs, no animated grain.

### The route line (signature background element)

A 2px cobalt line representing the intercepted request, used in hero and demo:
- A 10×10px chartreuse "packet" square travels it slowly (8–12s linear loop) while the section is visible.
- Pauses when off-screen (IntersectionObserver toggles `animation-play-state`) and on `visibilitychange`.
- Reduced motion: static line, packet parked at 60%.
- During a demo run, the packet accelerates once and the target ledger row flashes — this is the only time the route line "means" something.

---

## 7. Storytelling script (section by section)

Copy below is direction + approved lines. Keep every field to: **one headline, ≤ 3 short paragraphs or one artifact, one next step.** No walls of text, no feature grids.

### 01 — Mineral Hero · the promise
- Display claim (poster grammar):
  ```
  LET AGENTS BUILD FAST.
  PROVE THE UI SURVIVES REAL STATES.   ← chartreuse underline sweep, one time
  ```
- Pixel chip strip: `[ LOADING ] [ EMPTY ] [ ERROR ] [ OFFLINE ]` and `04 STATES / 01 PROOF CARD`.
- One-line command terminal: `npx stateproof init --url http://localhost:5173 --route /account/settings` with COPY.
- Right side: a physical proof artifact sheet (mini settings-skeleton capture + PASS stamp), overlapping the next seam.
- No centered trio, no second CTA, no logo wall.

### 02 — Navy Ledger · the mechanism (core motif)
Four horizontal rows. Columns: `pixel ID · STATE word · forced response · expected selector · status`.
```
01 LOADING   response: delay 3000ms                  expect [data-state='loading']   PASS
02 EMPTY     response: fixture account-empty.json    expect [data-state='empty']     PASS
03 ERROR     response: error 500                     expect [data-state='error']     FAIL→fixed
04 OFFLINE   response: abort internetdisconnected    expect [data-state='offline']   PASS
```
Row 03 may carry the honest coral note `retry control missing < 420px → FAIL` and the hint `hint: render a retry control below 420px` — showing failure is part of the story.
Section headline direction: "The happy path is not proof."

### 03 — Cobalt Strip · the workflow
Three numbered stations, one line each, mono commands underneath:
```
1 CHOOSE A REQUEST   GET /api/account
2 FORCE A STATE      "mode": "error" | 500
3 CAPTURE PROOF      PASS / FAIL / ERROR + screenshot
```
Primary CTA lives here or in the closing, never twice before.

### 04 — Mineral Workflow · the experience
Editorial prose (65ch), 2–3 short paragraphs:
- Runs beside `npm run dev` against localhost; headless Chromium; no MSW, no proxy, no app edits (R2).
- Strict JSON scenario file; empty responses are explicit fixtures — "Stateproof never guesses your empty shape" (R5).
- Evidence: screenshots + Stateproof Card + offline HTML report.
Artifact: the full **Stateproof Card** rendered exactly as the product emits it (§12 accuracy), on a paper sheet.

### 05 — Navy Demo · force a state yourself
The interactive module (§9). Headline direction: "Force the state. Capture the proof."

### 06 — Teal Trust · local-first, honest by default
Short guardrail ledger (icon-free, typographic): no telemetry (R1) · interception only in our browser (R2) · loopback guardrail, `--allow-remote` explicit (R3) · screenshots stay in `./artifacts` until you share them · report opens from `file://` with zero network.
Never write "Your data is safe with us."

### 07 — Ink Closing · run your first proof
Dark ink field, mineral type. Install block (mono, copy-all):
```
$ npm i -D github:OWNER/stateproof        # ← replace OWNER with the real repo before launch
$ npx playwright install chromium
$ npx stateproof init --url http://localhost:3000 --route /settings
$ npx stateproof run
```
Buttons: GITHUB (primary chartreuse on ink) · COPY COMMANDS.
Meta line: `node ≥ 20 · chromium via playwright · zero telemetry`.
Sign-off (honest): **"Captured, not guaranteed."**

---

## 8. Micro-interactions & human behavior

Design for how people actually read and decide:

- **First 3 seconds:** one claim + one artifact. Nothing else competes in the hero.
- **Scanning:** mineral fields follow F-pattern (headline top-left, prose left-aligned, artifact right). Ledger rows are scanned horizontally — keep column positions identical across all four rows.
- **Hover is a question, click is a promise:** hover reveals (sheet shifts, seam brightens, underline slides); click commits (state arms, run starts). Hover never triggers irreversible or loud effects.
- **Motor memory:** keys `1–4` map to ledger row order, top to bottom.
- **Scroll fatigue:** alternating field colors (mineral → navy → cobalt → mineral → navy → teal → ink) resets attention; never four same-color fields in a row.
- **Cognitive load:** one decision per viewport. Commands appear exactly where the action they describe is explained — never a naked code block.
- **Thumb reach (mobile):** demo controls stack full-width in reading order; nothing essential sits top-right.

### Interaction map

| Zone | Trigger | Response | Timing | Disabled when |
|---|---|---|---|---|
| Buttons | hover | sheet shift −2px, shadow grows 6→8px | 120ms ease-out | touch (use `:hover` media query guard) |
| Buttons | press | `scale(.97)` + shadow collapses to 2px | 120ms | reduced-motion → opacity pulse only |
| Nav links | hover | underline slides in from left | 120ms | — |
| State chip (ledger) | armed | 3px ink offset frame + chartreuse square mark | 160ms | — |
| Ledger rows | demo active | active row color-field swap + 6px lateral slide of state word | 160ms | reduced-motion → instant swap |
| Capture stamp | proof captured | `scale(1.15)→1`, rotate −2°, chartreuse | 180ms | reduced-motion → appears instantly |
| Copy buttons | click | label → `COPIED ▪`, reverts after 1400ms | instant + timeout | clipboard fallback required |
| Sections | first 15% visible | artifact/headline rises 16px + fades, rows stagger 60ms | 220ms | reduced-motion; never re-runs on scroll up |
| Route line | section visible | packet travels | 8–12s loop | off-screen, tab hidden, reduced-motion |

### Where NOT to animate (this is what keeps it human-made)

Body paragraphs, tables, the card artifact's text, code blocks (no typing animation except the single hero command), footer, and anything the user is currently reading. Reveal animations run **once** and never on scroll-up. No bounce, no elastic, no confetti — a completed run ends in stillness.

### Keyboard & shortcuts

| Key | Action | Scope |
|---|---|---|
| Tab / Shift+Tab | move focus through all controls | global, visible 2px focus ring |
| Enter / Space | activate focused control | global |
| ← → / ↑ ↓ | move within switchboard (roving tabindex) | demo widget only |
| 1–4 | arm LOADING / EMPTY / ERROR / OFFLINE | only when demo widget has focus **or** is ≥ 60% in viewport; ignore when modifier keys held |
| R | run capture | same scoping as 1–4 |
| Esc | reset demo to normal passthrough | demo widget only |

Rules: no global capture-phase listeners; never `preventDefault` outside the widget; never hijack Cmd/Ctrl/Alt combos; focus rings: 2px ink + 2px offset on light fields, 2px chartreuse on dark fields.

---

## 9. The interactive demo (spec)

A fake account-settings screen whose API the visitor forces into the four states. This is the one place the page behaves like the product.

**Composition:** paper-light preview panel (`--mineral-hi`) inside the navy field; left = switchboard column, right = preview, bottom = ledger row + result line.

**Controls**
- Switchboard: 4 toggle buttons (`aria-pressed`), pixel labels, exactly one armed at a time; a quiet `NORMAL` reset via Esc.
- Viewport toggle: `desktop 1440×1024 / mobile 390×844` (radio, mono).
- RUN button (chartreuse) — also fires on `R`.

**Behavior**
1. Arm a state → route line packet accelerates once → preview swaps with 160ms lateral slide + color-field swap:
   - LOADING: skeleton shimmer blocks (CSS-only).
   - EMPTY: dashed empty panel + `CONNECT` control.
   - ERROR: coral alert `HTTP 500 — GET /api/account` + RETRY control.
   - OFFLINE: banner `network: offline — request aborted` + dimmed content.
2. RUN → `capturing …` (mono, ≤ 700ms) → **CAPTURED stamp** + ledger row status + result line:
   `PASS  account-error  desktop  3.4s  [data-state='error']` (mono, colored word + shape).
3. The honest failure path: **ERROR + mobile** hides the retry control → result `FAIL  account-error  mobile  15.0s  selector timeout` with `hint: render a retry control below 420px`. This failure is a feature of the story — keep it.
4. Announce to screen readers: preview region `aria-live="polite"` — "Error state captured — PASS desktop, FAIL mobile: retry control missing."

**Constraints:** no real network calls (everything is in-page simulation), no external assets, widget JS ≤ ~6KB, works without JS as a static annotated ledger (progressive enhancement).

---

## 10. Motion & parallax budget

**Prime rule: motion reveals evidence, never decorates.** Total kinetic moments on screen at once: **one.**

### 10.1 Timing & easing
- 120ms hover/focus · 160ms state swaps · 220ms reveals. Nothing else except the route-line loop.
- `ease-out` family only (`--ease`). No bounce/elastic.

### 10.2 Parallax (strict budget)
- Allowed layers: field background grids (factor **0.04–0.08**), giant ghost state words (0.08–0.12), hero proof sheet (**−0.06**, counter-direction).
- **Never** on text, never on interactive controls, never on the ledger rows.
- Implementation: passive scroll listener → single `requestAnimationFrame` → `transform: translate3d()` only. Cache element offsets on resize; never read layout (`getBoundingClientRect`) inside the scroll handler. Gate with IntersectionObserver; stop when tab hidden.
- **Disable entirely** when: `prefers-reduced-motion`, viewport < 768px, or `matchMedia('(pointer: coarse)')` with low device memory. Mobile gets zero parallax.

### 10.3 Animated background moments (rationed)
1. Route-line packet (hero + demo) — §6.
2. Demo scanline across the active ledger row during a run — one pass only.
3. Ticker strip (one on the whole page, between 03 and 04): slow mono marquee of technical metadata (`delay 3000ms ▪ fixture account-empty.json ▪ status 500 ▪ internetdisconnected ▪ exit 0 ▪ exit 1 …`), pauses on hover, static under reduced motion.

Nothing else moves in backgrounds. No gradient orbs, no floating shapes, no animated noise.

### 10.4 Dynamic typography movement (max one per viewport)
- Hero: line-mask reveal (each line rises inside `overflow:hidden`, ≤ 300ms, 80ms stagger) + one chartreuse underline sweep.
- Ledger: state-word 6px slide on arm.
- Capture stamp scale-in.
- No per-character animation, no typewriter body text, no count-up numbers.

### 10.5 Reduced motion contract
Under `prefers-reduced-motion: reduce`: kill parallax, packet loops, ticker animation, reveals (elements simply exist), stamp/underline entrances. **Keep** instant color/status swaps — state change must remain visible without motion.

---

## 11. Performance contract (must render fast)

| Budget | Limit |
|---|---|
| Delivery | Single self-contained HTML file: inline CSS, vanilla JS, no framework, no build step required to open it |
| LCP | ≤ 2.0s on mid-range mobile / 4G |
| CLS | ≤ 0.05 (reserved metrics for font swap, explicit image-less artifact sizes) |
| JS | ≤ 15KB total, ≤ 6KB for the demo widget; no third-party scripts |
| CSS | ≤ 30KB |
| Fonts | 3 families, 6 weights max, woff2, preconnect + `display=swap`, ≤ 130KB |
| Images | **Zero raster images in v1** — all artifacts (skeletons, alerts, card, report mock) are CSS-rendered. Later real screenshots: WebP ≤ 80KB, lazy, explicit dimensions |
| Listeners | Passive scroll; IO-gated animations; no layout reads in handlers; `will-change` only while animating, removed after |
| Lighthouse target | Performance ≥ 95, A11y ≥ 95 |

---

## 12. Content accuracy checklist (v1 landing — agent must pass)

- [ ] Commands shown exist exactly: `init`, `run`, `list`, `export`; flags only from the frozen set (`--file --url --route --force --scenario --viewport --timeout-ms --allow-remote --allow-third-party --strict-secrets --reporter --run --format`).
- [ ] States are loading / empty / error / offline; response modes shown map correctly (delay / fixture / error / offline; inline optional mention).
- [ ] Statuses everywhere: PASS / FAIL / ERROR words — never color-only, never WARN/SKIP.
- [ ] Default viewports named exactly: desktop 1440×1024, mobile 390×844.
- [ ] Card artifact matches the canonical format (title, state × viewport table, `Artifacts:` line, `Run:` metadata line with version · browser · runId · ISO timestamp).
- [ ] No promise of TUI/studio, MCP, visual diff, cloud sync as available. At most one mono "post-v1" line.
- [ ] Honest voice audit: no "bug-free / fully tested / guaranteed / success"; empty-state copy says fixtures are explicit and never guessed; privacy copy says screenshots stay local until shared.
- [ ] Install line uses the real repo reference (replace `OWNER/stateproof` before launch).

### Canonical card (render exactly this shape)
```
## Stateproof Card — Account settings
| State   | desktop | mobile |
|---------|:-------:|:------:|
| Loading | PASS    | PASS   |
| Empty   | PASS    | PASS   |
| Error   | PASS    | FAIL   |
**Artifacts:** `artifacts/stateproof/account-settings/` — account-loading.desktop.png · …
**Run:** local · Stateproof 0.1.0 · Chromium 141 · runId 01J9ZK… · 2026-08-23T14:02:15Z
```

---

## 13. References — what we take, and where

| Reference | Principle | Applied at |
|---|---|---|
| Josef Müller-Brockmann — *Grid Systems in Graphic Design* (Swiss Style) | Asymmetric, type-first grid; hierarchy by size/weight, not decoration | Every field's 12-col layout; 7/5 text–artifact split |
| Armin Hofmann — Swiss posters | One high-contrast focal element per composition | Hero: claim vs. single proof sheet |
| NASA Graphics Standards Manual (Danne & Blackburn, 1975) | Instrumentation: tick marks, labels, color blocking as information | Navy console bezel, pixel field IDs, ledger ticks |
| Massimo Vignelli — NYC Subway Map (1972) | A limited palette where each color owns one meaning; hard geometry | State color allocation; chartreuse = proof line only |
| Jan Tschichold / Penguin Books composition grids | 2:1 and 3:2 editorial proportions, deliberate asymmetry | Mineral workflow field, artifact offsets |
| Stripe Press | Warm paper tones, calm long-form rhythm, generous leading | Mineral fields' typography and whitespace |
| Linear (marketing site) | Scroll-linked reveals with restraint; motion that explains the product | Reveal budget §10; demo choreography |
| Vercel / Geist | Monospace as the metadata voice; high-contrast discipline | IBM Plex Mono usage, command blocks |
| Braun / Dieter Rams — "less, but better" | Delete until only the useful remains | §14 avoid-list; one-idea-per-field rule |

These are **principle sources**, not visual pastiche: no retro-arcade, no cyberpunk, no terminal cosplay.

---

## 14. Anti-slop rules (how it stays human-made)

**Never ship:**
- Centered hero trio (badge + headline + sub + two buttons, centered).
- Gradient blobs, aurora backgrounds, glassmorphism, neon glow.
- Rounded-2xl generic cards with soft shadows; icon + title + text 3-column feature grids.
- Emoji, stock/AI illustrations, abstract "AI neural" imagery.
- Fake social proof (invented logos, unearned counts, count-up stats).
- Marquee overload (one ticker only), autoplay anything, cursor effects, scroll-jacking.
- More than one kinetic moment per viewport; animation on reading text.

**Human-made signals to keep:**
- Consistent 8px rhythm with two deliberate breaks (an off-grid caption, an overlapping sheet).
- Ledger tabs (pixel IDs), registration marks, seams that look cut, not generated.
- Lowercase mono annotations that read like margin notes.
- Asymmetry with a spine: content alternates sides but always aligns to the same 12-col grid.
- Stillness after action — a captured proof does not celebrate; it is stamped.

---

## 15. Accessibility floor

- Contrast: §2.3 ledger, enforced in review.
- Status = word + color + shape, always three channels (square/×/! marks).
- Full keyboard reachability incl. demo (§8); visible 2px focus rings.
- Landmarks: `header / main / section(with aria-labelledby) / footer`; demo is a labeled region.
- Touch targets ≥ 44px; state controls full-width on mobile.
- Text zoom 200% without horizontal scroll; `prefers-reduced-motion` contract (§10.5).
- Demo works without JS (static annotated ledger fallback).

---

## 16. Implementation checklist (definition of done for the coding agent)

- [ ] All tokens from §2.1 used verbatim; no invented colors, fonts, or radii > 2px.
- [ ] 80/15/5 typography balance holds; pixel type only where §3.1 allows.
- [ ] All seven fields present in the §4 order, each with exactly one primary claim.
- [ ] State ledger motif appears in hero chips, section 02 rows, and demo result — same columns everywhere.
- [ ] Demo passes §9 incl. the honest mobile FAIL path and keyboard-only operation.
- [ ] Motion passes §10 budget; reduced-motion walkthrough done.
- [ ] Contrast pairs verified against §2.3 with a checker.
- [ ] §12 content accuracy checklist all true (v1 claims only, honest voice).
- [ ] Performance: single file, budgets in §11 met, zero console errors, Lighthouse targets hit.
- [ ] Responsive walkthrough at 360 / 768 / 1024 / 1440 — fields keep their color identity; no collapse into one generic background.

---

## Appendix A — Compatibility with product surfaces

This document governs the **landing page only**. The shipped product surfaces keep their own constraints, which the landing page must respect when depicting them:

- **HTML report artifact** (shown as a mock on the page): stays dark-graphite/off-white, inline CSS only, no inline JS, zero network, PASS/FAIL/ERROR words. The mock may be stylized but must not show features the report lacks.
- **Stateproof Card**: exact canonical format (§12) — the landing renders it verbatim, pipes escaped, metadata line mandatory.
- **CLI output style** (shown in terminals): mono, statuses as words, hints indented under failures, `exit n` summary line.

If the product design system is later redesigned, this appendix moves with it; the landing page palette above is independent.