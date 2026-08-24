# `@stateproof/cli`

> The command-line interface and AI agent driver for Stateproof.

---

## Commands

### `stateproof init`
Scaffolds a `stateproof.scenarios.json` configuration file, fixtures directory, and `.gitignore` entries:
```bash
stateproof init [--file <path>] [--url <baseUrl>] [--route <path>] [--force]
```

### `stateproof list`
Inspects and validates scenarios and viewports without launching a browser:
```bash
stateproof list [--file <path>] [--reporter human|json]
```

### `stateproof run`
Executes scenarios across viewports against a local web application:
```bash
stateproof run [scenarios...] [--file <path>] [--url <baseUrl>] [--viewport <names...>] [--reporter human|json]
```

### `stateproof export`
Exports Stateproof Card evidence from generated test runs:
```bash
stateproof export [--run <artifactDir>] [--file <scenarioFilePath>] [--format md|json|html]
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
