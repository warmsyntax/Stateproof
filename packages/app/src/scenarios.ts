import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  DEFAULT_VIEWPORTS,
  parseScenarioText,
  type Scenario,
  type ScenarioFile,
  StateproofError,
  scanTextForSecrets,
  scanValueForSecrets,
  type Viewport,
  validateScenarioShape,
  validateSemantics,
} from '@stateproof-dev/core';
import pc from 'picocolors';

export function loadAndValidateScenarioFile(filePath: string): {
  file: ScenarioFile;
  absolutePath: string;
} {
  const absPath = resolve(process.cwd(), filePath);
  if (!existsSync(absPath)) {
    throw new StateproofError({
      code: 'SCENARIO_FILE_MISSING',
      message: `Scenario file not found at: ${filePath}`,
      hint: 'Run "stateproof init" to create one or pass --file with a valid path.',
      file: filePath,
    });
  }

  let text: string;
  try {
    text = readFileSync(absPath, 'utf-8');
  } catch (error) {
    throw new StateproofError({
      code: 'SCENARIO_FILE_MISSING',
      message: `Could not read scenario file at ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      hint: 'Verify file permissions and path.',
      file: filePath,
    });
  }

  const { value } = parseScenarioText(text, filePath);
  const file = validateScenarioShape(value);
  validateSemantics(file);
  return { file, absolutePath: absPath };
}

export function resolveSelectedScenarios(
  scenarios: Scenario[],
  fileName: string,
  positionals: string[] = [],
  scenarioFlags: string[] = [],
): Scenario[] {
  const flags = scenarioFlags.filter(Boolean);
  const pos = positionals.filter(Boolean);

  if (flags.length === 0 && pos.length === 0) {
    return scenarios;
  }

  const requestedIds = new Set<string>();

  if (flags.length > 0) {
    for (const f of flags) requestedIds.add(f);
    for (const p of pos) requestedIds.add(p);
  } else if (pos.length === 1 && pos[0] === fileName) {
    return scenarios;
  } else {
    for (const p of pos) requestedIds.add(p);
  }

  const availableMap = new Map(scenarios.map((s) => [s.id, s]));
  const matched: Scenario[] = [];

  for (const id of requestedIds) {
    const found = availableMap.get(id);
    if (!found) {
      throw new StateproofError({
        code: 'NO_SCENARIOS_SELECTED',
        message: `Scenario id "${id}" not found in scenario file.`,
        hint: `Available scenario ids: ${scenarios.map((s) => s.id).join(', ')}`,
      });
    }
    matched.push(found);
  }

  return matched;
}

export function resolveSelectedViewports(
  fileViewports: Viewport[] | undefined,
  requestedNames: string[] = [],
): Viewport[] {
  const viewports = fileViewports ?? DEFAULT_VIEWPORTS;
  if (!requestedNames || requestedNames.length === 0) {
    return viewports;
  }

  const availableMap = new Map(viewports.map((v) => [v.name, v]));
  const matched: Viewport[] = [];

  for (const name of requestedNames) {
    const found = availableMap.get(name);
    if (!found) {
      throw new StateproofError({
        code: 'NO_VIEWPORTS_SELECTED',
        message: `Viewport "${name}" not found in configured viewports.`,
        hint: `Available viewports: ${viewports.map((v) => v.name).join(', ')}`,
      });
    }
    matched.push(found);
  }

  return matched;
}

export function runSecretAudit(
  scenarios: Scenario[],
  scenarioFilePath: string,
  strictSecrets: boolean,
  stderr: (msg: string) => void = (msg) => process.stderr.write(`${msg}\n`),
): void {
  const baseDir = dirname(resolve(scenarioFilePath));
  const findings: Array<{ scenarioId: string; finding: string }> = [];

  for (const scenario of scenarios) {
    const responsesToCheck = [scenario.response, scenario.recovery?.response].filter(
      (r): r is NonNullable<typeof r> => r !== undefined,
    );
    for (const resp of responsesToCheck) {
      if (resp.mode === 'inline') {
        const issues = scanValueForSecrets(resp.body);
        for (const iss of issues) {
          findings.push({
            scenarioId: scenario.id,
            finding: `inline body contains ${iss.kind}: ${iss.detail}`,
          });
        }
      } else if (resp.mode === 'fixture') {
        const fixturePath = join(baseDir, resp.path);
        if (existsSync(fixturePath)) {
          const content = readFileSync(fixturePath, 'utf-8');
          const issues = scanTextForSecrets(content);
          for (const iss of issues) {
            findings.push({
              scenarioId: scenario.id,
              finding: `fixture ${resp.path} contains ${iss.kind}: ${iss.detail}`,
            });
          }
        }
      }
    }
  }

  if (findings.length > 0) {
    if (strictSecrets) {
      throw new StateproofError({
        code: 'SECRET_SCAN_FAILED',
        message: `Potential secret(s) detected with --strict-secrets:\n${findings.map((f) => `  • [${f.scenarioId}] ${f.finding}`).join('\n')}`,
        hint: 'Remove hardcoded credentials from fixtures or inline bodies, or run without --strict-secrets.',
      });
    } else {
      stderr(
        pc.yellow(
          `warning: potential secret(s) detected in scenarios (run with --strict-secrets to fail):\n` +
            findings.map((f) => `  • [${f.scenarioId}] ${f.finding}`).join('\n'),
        ),
      );
    }
  }
}
