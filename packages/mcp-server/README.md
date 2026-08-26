# `@stateproof-dev/mcp-server`

> Model Context Protocol (MCP) server bridge for Stateproof frontend runtime validation.  
> Allows AI coding agents (Cursor, Claude Desktop, GitHub Copilot, Antigravity) to inspect, validate, and self-heal frontend UI states autonomously.

---

## Agent Configuration

Add this configuration to your MCP settings file (e.g. `claude_desktop_config.json` or `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "stateproof": {
      "command": "npx",
      "args": ["-y", "@stateproof-dev/mcp-server"]
    }
  }
}
```

---

## Exposed MCP Tools

### 1. `stateproof_list_scenarios`
Inspects and lists all defined scenario files, routes, mock rules, and configured viewports in the target project.

**Arguments:**
- `file` *(optional)*: Path to scenario file (default: `stateproof.scenarios.json`).
- `projectRoot` *(optional)*: Root project directory to resolve files from.

### 2. `stateproof_run_validation`
Executes deterministic frontend state machine validation against the target local application in a controlled headless Chromium instance.

**Arguments:**
- `file` *(optional)*: Path to scenario file.
- `scenario` *(optional)*: Array of specific scenario IDs to run.
- `viewport` *(optional)*: Array of viewport names (e.g. `["desktop", "mobile"]`).
- `url` *(optional)*: Override target application baseUrl.
- `diff` *(optional)*: Enable visual diffing against baselines.
- `diffThreshold` *(optional)*: Maximum allowed pixel diff ratio.

### 3. `stateproof_inspect_failure`
Deeply inspects failing scenario outcomes to extract failure codes (`selector-timeout`, `fixture-missing`), actionable hints, DOM suggestions, and failure screenshots for automated self-healing.

**Arguments:**
- `run`: Target artifact directory path or scenario run name.
- `scenario` *(optional)*: Specific scenario ID to inspect.
- `viewport` *(optional)*: Specific viewport name.

---

## Security & Isolation

- Operates strictly on `stdio` transport.
- Inherits Stateproof's loopback and privacy guardrails.
- Zero telemetry and zero external network calls.
