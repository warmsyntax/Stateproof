# `@stateproof-dev/cli`

> The command-line interface, interactive TUI, and AI agent driver for Stateproof.

---

## Installation & Execution

```bash
# Run directly via npx without installation:
npx @stateproof-dev/cli --tui
npx @stateproof-dev/cli init --url http://localhost:5173
npx @stateproof-dev/cli run
```

---

## Commands

### `stateproof init`
Scaffolds a `stateproof.scenarios.json` configuration file, fixtures directory, and `.gitignore` entries:
```bash
npx @stateproof-dev/cli init [--file <path>] [--url <baseUrl>] [--route <path>] [--force]
```

### `stateproof studio` / `stateproof --tui`
Launches the interactive terminal studio (TUI) with scenario multi-selection:
```bash
npx @stateproof-dev/cli --tui
# or
npx @stateproof-dev/cli studio
```

### `stateproof list`
Inspects and validates scenarios and viewports without launching a browser:
```bash
npx @stateproof-dev/cli list [--file <path>] [--reporter human|json]
```

### `stateproof run`
Executes scenarios across viewports against a local web application:
```bash
npx @stateproof-dev/cli run [scenarios...] [--file <path>] [--url <baseUrl>] [--viewport <names...>] [--reporter human|json]
```

### `stateproof export`
Exports Stateproof Card evidence from generated test runs:
```bash
npx @stateproof-dev/cli export [--run <artifactDir>] [--file <scenarioFilePath>] [--format md|json]
```

---

## Machine Envelopes (`--reporter json`)

When invoked with `--reporter json`, Stateproof guarantees deterministic, single-document JSON output on stdout:

```json
{
  "type": "run.result",
  "ok": true,
  "data": { ... },
  "error": null
}
```

---

## Exit Codes

- `0`: All scenarios passed across all viewports.
- `1`: One or more scenarios failed assertions or selector waits.
- `2`: Schema error, missing scenario file, or CLI usage error.
- `3`: Environment error (target web application unreachable or browser binary missing).
- `4`: Internal runner error.
