# `@stateproof/reporter-html`

> Standalone, self-contained offline HTML report generator for Stateproof.

---

## Features

- **Offline-First**: Opens directly from `file://` with zero external network requests.
- **Zero Inline JavaScript**: Completely static and injection-proof.
- **100% Dynamic Escaping**: All user-controlled strings (scenario IDs, labels, selectors, failure messages, hints) are rigorously HTML-escaped.
- **Signal Foundry Design System**: Dark graphite base, off-white screenshot frames, high-contrast status glyphs, and responsive layout.
- **Accessible & Printable**: Full WCAG 2.1 AA compliant semantic `<table>` with `<th scope>`, accessible image `alt` tags, and `@media print` stylesheets.

---

## Output Layout

```text
report/
  index.html      # Self-contained HTML report with embedded CSS
  assets/
    *.png         # Copied screenshot captures
```

---

## Programmatic API

```ts
import { writeHtmlReport, renderHtmlReport } from '@stateproof/reporter-html';

const { htmlPath, assetsDir, assetCount } = await writeHtmlReport({
  result: runResult,
  artifactDir: 'artifacts/stateproof/account-settings',
});
```
