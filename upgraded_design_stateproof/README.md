# StateProof — Landing Page

A premium, brutalist-terminal landing page for **StateProof**, the deterministic runtime-proof CLI
that forces loading, empty, error and offline states in a controlled Chromium — and captures evidence.

Design language is fully specified in **[DESIGN.md](DESIGN.md)** ("PROOF FIELD" system).

---

## Goal

Present a developer CLI tool with the craft of a flagship product page: extreme-minimal dark
environment, pixel-perfect typography, stepped (non-smooth) motion, true-transparent ASCII art
emblems, a pinned horizontal evidence rail, and a luminous horizon footer. No fake terminal
windows, no rounded corners, no cheap blue/purple.

---

## Completed features

- **00 // Signal hero** — giant display headline, stepped boot-sequence reveal, transparent ASCII
  winged-shield emblem behind the type, sparse dot clusters + twinkling pixel particles, copy-chips.
- **Proof Field background** — a fixed `<canvas>` that draws symmetric lines and square outlines which
  *re-form* (in discrete integer steps) as you scroll.
- **Marquee ticker** — wire vocabulary scrolling in hard steps.
- **01 // Proof Line** — a **pinned horizontal-scroll** rail (GSAP ScrollTrigger). Vertical wheel scroll
  slides four evidence exhibit cards (LOADING / EMPTY / ERROR / OFFLINE) + a sealed-verdict card
  sideways; when the rail finishes, normal vertical scroll resumes. Stepped notch progress indicator.
- **02 // Instrument** — four editorial ledger rows (zero-friction attach, recovery loops, socket drops,
  DOM/pixel lens) beside the transparent ASCII hand emblem.
- **03 // Perimeter** — four stamped rule tiles (§R1–§R4: zero telemetry, pure CDP, origin-locked,
  disk-only) beside the transparent ASCII seal emblem.
- **04 // Execute** — transparent ASCII monitor emblem, three copy-chips (init / MCP / agent prompt),
  a 4-cell verdict grid, GitHub CTA.
- **Horizon footer** — one glowing hairline "horizon", giant clipped `STATEPROOF.` wordmark, link columns,
  motto *"Captured, not guaranteed."*
- **Copy-to-clipboard** on all chips with stepped `COPIED ✓` confirmation + toast.
- **Pixel favicon** — `[/s]` hand-drawn on a 12×8 grid, `shape-rendering: crispEdges`.
- Responsive (mobile: rail becomes a native snap-scroll strip) and `prefers-reduced-motion` safe.

---

## Entry points / structure

| Path | Purpose |
|---|---|
| `index.html` | The entire landing page (single page, anchored chapters). |
| `#proof-line` | Pinned horizontal evidence rail. |
| `#instrument` / `#perimeter` / `#execute` | Capability, integrity, and run chapters. |
| `DESIGN.md` | The full design-system specification. |
| `favicon.svg` | Pixelated `[/s]` mark. |

No build step. Static HTML/CSS/JS with CDN libraries.

---

## Tech & assets

- **Fonts:** Silkscreen (pixel), Space Grotesk (display), IBM Plex Mono (mono) — Google Fonts.
- **Motion:** GSAP 3 + ScrollTrigger (CDN) — all eases are `steps()`.
- **Images:** four AI-generated ASCII artworks, background-removed to transparent PNG (`images/*-t.png`).
- **Palette:** ink `#0B0B09` · bone `#E8E4D8` · signal-lime `#D4F638` · fail-coral `#FF4D2E` · wire-mint `#9EC7BB`.

---

## Not yet implemented

- Real NPM download counts / live package data (would need a CORS-enabled registry proxy).
- A live interactive demo (running the actual CLI in-browser) — out of scope for a static site.
- i18n.

## Recommended next steps

1. Add an `llms.txt` (the original site referenced one) for AI-agent discoverability.
2. Lazy-load the two below-fold emblem PNGs with `loading="lazy"` (already set) + consider `webp` exports.
3. Add Open Graph / Twitter meta + a social share image.
4. Consider a lightweight docs sub-page.

---

## Data models / storage

None. This is a fully static, content-only site — no tables, no backend, no telemetry (matching the
product's own zero-telemetry ethos).
