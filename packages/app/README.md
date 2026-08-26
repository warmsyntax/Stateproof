# `@stateproof-dev/app`

> Shared application orchestration layer for Stateproof CLI and MCP Server.

---

## Features

- **Centralized Orchestration**: Common engine for `init`, `list`, `run`, and `export` logic shared between CLI and MCP Server.
- **Loopback & Security Audit**: Verifies that target URLs resolve to loopback interfaces and scans scenarios for leaked credentials.
- **Failure Inspector**: Extracts actionable diagnostics and selector suggestions from test run artifacts.

---

## Installation

```bash
npm install @stateproof-dev/app
# or
pnpm add @stateproof-dev/app
```
