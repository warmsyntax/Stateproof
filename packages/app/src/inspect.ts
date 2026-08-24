import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildEnvelope, StateproofError, type Envelope, type RunResult, type ScenarioOutcome, type ScenarioVisualDiff } from '@stateproof/core';
import { resolveArtifactDirectory } from './export.js';

export interface InspectFailureOptions {
  run: string;
  scenario?: string | undefined;
  viewport?: string | undefined;
  artifactsRoot?: string | undefined;
}

export interface FailureInspectionData {
  runId: string;
  scenarioId: string;
  viewport: string;
  status: 'passed' | 'failed' | 'error';
  failureCode?: string | undefined;
  message?: string | undefined;
  hint?: string | undefined;
  screenshot?: string | undefined;
  suggestions?: { selectors: string[] } | undefined;
  visualDiff?: ScenarioVisualDiff | undefined;
}

export interface AppInspectResult {
  data: FailureInspectionData;
  outcome: ScenarioOutcome;
  envelope: Envelope<FailureInspectionData>;
}

export async function inspectFailure(options: InspectFailureOptions): Promise<AppInspectResult> {
  const artifactDir = resolveArtifactDirectory({
    run: options.run,
    artifactsRoot: options.artifactsRoot,
  });

  const runJsonPath = join(artifactDir, 'run.json');
  if (!existsSync(runJsonPath)) {
    throw new StateproofError({
      code: 'EXPORT_RUN_MISSING',
      message: `run.json not found in artifact directory: ${artifactDir}`,
      hint: 'Execute stateproof run to generate run artifacts first.',
    });
  }

  const runResult: RunResult = JSON.parse(readFileSync(runJsonPath, 'utf-8'));
  const scenarios = runResult.scenarios;

  let matchedOutcome: ScenarioOutcome | undefined;

  if (options.scenario && options.viewport) {
    matchedOutcome = scenarios.find(
      (s) => s.id === options.scenario && s.viewport.name === options.viewport,
    );
  } else if (options.scenario) {
    matchedOutcome = scenarios.find((s) => s.id === options.scenario);
  } else if (options.viewport) {
    matchedOutcome = scenarios.find((s) => s.viewport.name === options.viewport);
  } else {
    // Pick the first failed/error scenario
    matchedOutcome = scenarios.find((s) => s.status === 'failed' || s.status === 'error') ?? scenarios[0];
  }

  if (!matchedOutcome) {
    throw new StateproofError({
      code: 'NO_SCENARIOS_SELECTED',
      message: `No matching scenario outcome found in run ${runResult.runId}`,
      hint: 'Check scenario id and viewport name.',
    });
  }

  const inspectionData: FailureInspectionData = {
    runId: runResult.runId,
    scenarioId: matchedOutcome.id,
    viewport: matchedOutcome.viewport.name,
    status: matchedOutcome.status,
    failureCode: matchedOutcome.failureCode,
    message: matchedOutcome.message,
    hint: matchedOutcome.hint,
    screenshot: matchedOutcome.artifacts.screenshot
      ? join(artifactDir, matchedOutcome.artifacts.screenshot)
      : undefined,
    suggestions: matchedOutcome.suggestions,
    visualDiff: matchedOutcome.visualDiff,
  };

  const envelope = buildEnvelope<FailureInspectionData>({
    type: 'inspect.result',
    data: inspectionData,
    exitCode: matchedOutcome.status === 'passed' ? 0 : 1,
  });

  return {
    data: inspectionData,
    outcome: matchedOutcome,
    envelope,
  };
}
