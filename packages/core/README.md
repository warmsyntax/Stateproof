# `@stateproof-dev/core`

> Pure domain model, schema validation, request matching, machine envelopes, and card rendering for Stateproof.

---

## Features

- **Pure TypeScript Domain**: Zero Node-specific or browser-specific dependencies. Usable in Node, Deno, Bun, and browser environments.
- **Scenario Schema Validation**: Zod-based runtime schema validation with actionable, human-friendly error messages and hints.
- **Request Matcher**: Fast URL glob pattern matching (powered by `picomatch`) matching pathnames only while ignoring transient query parameters.
- **Card Formatter**: Markdown and JSON Stateproof Card generators with strict table layout and reproducibility metadata.
- **Secret Scanning**: Scans scenario definitions and JSON responses for credentials, bearer tokens, AWS keys, and private keys.
- **Exit Code Registry**: Canonical machine error codes (`SCHEMA_INVALID`, `PATTERN_TOO_BROAD`, `NON_LOOPBACK_URL`, etc.).

---

## Installation

```bash
npm install @stateproof-dev/core
# or
pnpm add @stateproof-dev/core
```

---

## Public API

```ts
import {
  validateScenarioShape,
  validateSemantics,
  matchesRequest,
  renderMarkdownCard,
  buildJsonCard,
  scanTextForSecrets,
} from '@stateproof-dev/core';
```
