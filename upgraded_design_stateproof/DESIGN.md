# STATEPROOF — Design System "PROOF FIELD"

> Landing page design language for StateProof, the deterministic runtime-proof CLI.
> Aesthetic family: **premium brutalist terminal** — the discipline of Apple product pages,
> the industrial confidence of Nothing, the editorial tension of Awwwards-winning brutalist sites,
> rendered as a dark instrument panel that a senior engineer would trust at 3 AM.

---

## 1. Concept

StateProof proves that a UI survives real failure states. The page itself is built like a proof:

- **Everything is hard-edged.** Zero border-radius. A proof is binary: PASS / FAIL. So are the corners.
- **Everything moves in steps.** No ease-in-out, no soft springs. All motion uses `steps()` easing —
  the discrete ticking of a state machine, the cadence of a terminal cursor.
- **Everything is evidence.** Sections are numbered like audit exhibits (`00 // SIGNAL` … `04 // EXECUTE`),
  closed by a **horizon footer** — the end of the document, the ground line of the instrument.
- **ASCII objects replace screenshots.** Instead of the clichéd "terminal window with commands",
  four hand-commissioned ASCII artworks (shield, intercepting hand, proof seal, monitor) act as
  section emblems — the same medium the product lives in (text), elevated to heraldry.

### The story arc (storytelling spine)

| Chapter | Emblem | Story beat |
|---|---|---|
| `00 // SIGNAL` | Winged shield | **The claim.** Agents ship the happy path. StateProof proves the unhappy ones. |
| `01 // PROOF LINE` | — | **The mechanism.** Four forced states, presented as a *horizontally scrolling evidence rail* — not a step list, not a terminal box. Each state is an exhibit card with injected response, expected selector and verdict. |
| `02 // INSTRUMENT` | Intercepting hand | **The craft.** Human-touched capability rows — editorial ledger lines with huge index numerals, wire-level interception, recovery loops, WS drops, pixel diffs. |
| `03 // PERIMETER` | Proof seal | **The oath.** Local-first, zero telemetry, loopback-locked. Stamped rules, not marketing promises. |
| `04 // EXECUTE` | Monitor w/ check | **The act.** Three copy-chips (init / MCP / agent prompt) and a deterministic verdict grid. No fake terminal chrome. |

---

## 2. Color — "Proof Field" palette

Dark, warm, expensive. **No generic SaaS blue, no purple, no gradients.**

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#0B0B09` | Page ground. Warm near-black (not pure `#000` — warmth signals craft). |
| `--ink-2` | `#12120F` | Raised panels. |
| `--line` | `#232320` | Hairline grid seams (the "ledger"). |
| `--bone` | `#E8E4D8` | Primary text. Warm bone-white, terminal phosphor. |
| `--dim` | `#8A877C` | Secondary text, 45%-warm-grey. |
| `--signal` | `#D4F638` | **Proof lime.** Used ONLY for: verified marks, live dots, the `/` in the logo, verdicts, primary CTA. Restraint = premium. |
| `--fail` | `#FF4D2E` | **Failure coral.** Only for the ERROR exhibit and FAIL states. |
| `--wire` | `#9EC7BB` | **Wire mint** (desaturated). Protocol/CDP accents, the hand's signal arcs at low opacity. |

Contrast: bone on ink = 14.8:1 (AAA). Signal on ink = 13.9:1. Dim on ink = 4.9:1 (AA).

---

## 3. Typography

Three voices, never mixed inside a single element:

| Voice | Font | Use |
|---|---|---|
| **Pixel** | `Silkscreen` (Google Fonts) | Section indices `00 //`, badges, buttons, nav, footer meta, the favicon's `[/s]`. Always uppercase, letter-spaced. This is the product's voice. |
| **Display** | `Space Grotesk` 500/700 | Hero statement and chapter headlines, set at `clamp(3rem, 9vw, 8.5rem)`, tight leading (`0.95`), uppercase, negative tracking. Editorial scale — the Awwwards move. |
| **Mono** | `IBM Plex Mono` 400/500 | Evidence: selectors, responses, coordinates, meta lines. The voice of the artifact. |

Rules: no italics, no light weights below 14 px, pixel font never used for body prose.

---

## 4. Shape & grid

- `border-radius: 0` globally. Chips, buttons, cards, images — all square-cut.
- 1 px hairline seams (`--line`) divide everything; the page reads as one continuous ledger sheet.
- 8 px spatial base unit; section padding `clamp(96px, 14vh, 160px)`.
- Max content width 1440 px; exhibit rail bleeds full-viewport.
- Ghost numerals (`01`–`04`) sit behind chapters at 28 vw, 4% opacity — blueprint depth.

---

## 5. Motion — "stepped, never smooth"

All animation is **discrete** (GSAP `ease: 'steps(n)'` / CSS `steps()`), evoking pixel-art and
state machines rather than liquid consumer-app motion.

1. **Boot sequence (hero):** headline lines pixel-reveal via clip-path steps (8 steps per line),
   meta rows cascade in 60 ms steps, signal dot blinks at 1 Hz hard on/off.
2. **Proof Line (mechanism):** a **pinned horizontal scroll** section (the canonical GSAP pattern).
   The section pins to the viewport top; vertical wheel/trackpad scroll scrubs the exhibit rail
   *sideways* (`scrub: 1`, `invalidateOnRefresh`) until the last card, then the page releases and
   normal vertical scrolling resumes. A stepped notch rail (five notches) snap-fills with progress.
   On mobile / reduced-motion it degrades to a native horizontal snap-scroll strip.
3. **Proof Field (background):** a fixed `<canvas>` behind everything draws a constellation of
   thin orthogonal lines and square outlines. As `document.scrollY` grows, the field *re-forms*:
   lines extend from the center axis, squares multiply at mirrored coordinates — symmetry that
   literally builds itself while scrolling. Rendered in integer steps (no sub-pixel easing).
4. **Emblem reveals:** ASCII artworks flicker in with an 6-step opacity/scanline stutter —
   like a CRT gaining signal. No fades.
5. **Micro:** hover states swap in `steps(2)`; copy buttons confirm with a hard state-flip
   (`COPY` → `COPIED ✓`), never a tween.

`prefers-reduced-motion` collapses everything to static final states.

---

## 6. Imagery — ASCII emblems

Four commissioned ASCII artworks, generated as ivory/chartreuse character grids, then **background-removed
to true transparent PNGs** so they composite directly onto the ink ground — the artwork looks *drawn by the
page itself*. Each emblem is anchored to the layout by **sparse dot-cluster fields and twinkling pixel
particles** (never a full-page carpet) so it feels native to the grid, not pasted on.

| File | Section | Meaning |
|---|---|---|
| `images/ascii-shield-t.png` | 00 Signal | Proof as protection; wings = agents, shield = the states that survive. |
| `images/ascii-hand-t.png` | 02 Instrument | The human hand on the wire — interception as craft, not automation theatre. |
| `images/ascii-seal-t.png` | 03 Perimeter | The stamped oath: local-first, zero telemetry. |
| `images/ascii-terminal-t.png` | 04 Execute | The machine agreeing with you: EXIT 0. |

Treatment: transparent PNG, `filter: contrast(1.04)`, surrounded by 2 masked dot clusters + 3–4 `.px` pixel
particles + `.crumbs` pixel trails, never rounded, never drop-shadowed.

### Favicon

`favicon.svg` — hand-drawn `[/s]` on an authentic 12×8 pixel grid, `shape-rendering: crispEdges`,
bone brackets, signal-lime slash, on ink. Bold at 16 px, legible at 32 px.

---

## 7. Layout inventory

1. **Nav** — fixed hairline bar: pixel logo `[/s] STATEPROOF`, numbered chapter links, GitHub chip.
2. **00 // SIGNAL** — full-viewport centered hero: pixel kicker, 9 vw display statement
   ("Agents ship the happy path. / We prove the rest."), three bare copy-chips (no terminal chrome),
   shield emblem behind type at low opacity, scroll cue.
3. **Marquee** — stepped ticker of wire vocabulary (delay 3000ms ▪ fixture account-empty.json ▪ …).
4. **01 // PROOF LINE** — pinned horizontal evidence rail (4 exhibit cards + terminal card).
5. **02 // INSTRUMENT** — four editorial ledger rows with giant numerals + hand emblem.
6. **03 // PERIMETER** — four stamped rule tiles (§R1–§R4) + seal emblem, oath line.
7. **04 // EXECUTE** — centered closing: monitor emblem, three copy-chips, verdict grid
   (4/4 PASS · 2.84s · 0 telemetry · exit 0).
8. **Horizon footer** — a single luminous hairline (the horizon), giant `STATEPROOF.` wordmark
   clipped by it, meta ledger row (MIT / llms.txt / zero telemetry / WCAG), motto
   *"Captured, not guaranteed."*

---

## 8. Anti-patterns (explicitly banned)

- ❌ border-radius > 0, soft shadows, glassmorphism, gradients of blue/purple
- ❌ fake macOS terminal windows with traffic lights
- ❌ "step 1-2-3-4" numbered feature cards in a 4-col grid (the old layout)
- ❌ ease-in-out / elastic / bounce easing — only `steps()`
- ❌ lorem-grade stock illustrations, emoji icons, generic hero dashboards
- ❌ more than one accent color per viewport

---

## 9. Accessibility & performance

- Semantic outline (`header/nav/main/section/footer`), aria labels on all interactive chips.
- All motion gated behind `prefers-reduced-motion`; canvas pauses off-screen (IntersectionObserver).
- Fonts via Google Fonts `display=swap`; GSAP via CDN with a no-JS static fallback
  (rail becomes a native scroll strip; canvas hidden).
- ASCII PNGs lazy-loaded below the fold; favicon is a 1 KB SVG.
