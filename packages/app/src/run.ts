import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildEnvelope,
  buildJsonCard,
  computeExitCode,
  type Envelope,
  type RunResult,
  renderMarkdownCard,
  STATEPROOF_VERSION,
  StateproofError,
} from '@stateproof-dev/core';
import { type RunFatal, runScenarios } from '@stateproof-dev/playwright-runner';
import { writeHtmlReport } from '@stateproof-dev/reporter-html';
import { checkAppReachability, verifyLoopback } from './network.js';
import {
  loadAndValidateScenarioFile,
  resolveSelectedScenarios,
  resolveSelectedViewports,
  runSecretAudit,
} from './scenarios.js';

export interface AppRunOptions {
  positionals?: string[] | undefined;
  file?: string | undefined;
  scenario?: string[] | undefined;
  viewport?: string[] | undefined;
  url?: string | undefined;
  timeoutMs?: number | undefined;
  failureBudgetMs?: number | undefined;
  failFast?: boolean | undefined;
  allowRemote?: boolean | undefined;
  allowThirdParty?: boolean | undefined;
  browserChannel?: string | undefined;
  cdpUrl?: string | undefined;
  strictSecrets?: boolean | undefined;
  artifactsRoot?: string | undefined;
  updateBaselines?: boolean | undefined;
  diff?: boolean | undefined;
  baselineDir?: string | undefined;
  diffThreshold?: number | undefined;
  workers?: number | undefined;
  headless?: boolean | undefined;
  skipNetworkCheck?: boolean | undefined;
  stateproofVersion?: string | undefined;
}

export interface AppRunResult {
  result: RunResult;
  exitCode: number;
  fatal?: RunFatal | undefined;
  envelope: Envelope<RunResult>;
  cardMd: string;
  cardJson: unknown;
  artifactDir: string;
}

export async function executeRun(options: AppRunOptions): Promise<AppRunResult> {
  const filePath = options.file ?? 'stateproof.scenarios.json';
  const { file, absolutePath } = loadAndValidateScenarioFile(filePath);

  // 1. Resolve scenarios and viewports
  const selectedScenarios = resolveSelectedScenarios(
    file.scenarios,
    file.name,
    options.positionals,
    options.scenario,
  );

  const selectedViewports = resolveSelectedViewports(file.viewports, options.viewport);

  if (selectedScenarios.length === 0) {
    throw new StateproofError({
      code: 'NO_SCENARIOS_SELECTED',
      message: 'No scenarios matched the provided filters.',
      hint: 'Check scenario ids with stateproof list.',
      file: filePath,
    });
  }

  if (selectedViewports.length === 0) {
    throw new StateproofError({
      code: 'NO_VIEWPORTS_SELECTED',
      message: 'No viewports matched the provided filters.',
      hint: 'Check viewport names with stateproof list.',
      file: filePath,
    });
  }

  // 2. Secret scanning
  runSecretAudit(selectedScenarios, absolutePath, Boolean(options.strictSecrets));

  // 3. Resolve target baseUrl & guardrails
  const effectiveBaseUrl = options.url ?? file.baseUrl;
  if (!options.skipNetworkCheck) {
    await verifyLoopback(effectiveBaseUrl, Boolean(options.allowRemote));
    await checkAppReachability(effectiveBaseUrl, 10000);
  }

  // 4. Execute scenarios via runner
  const runnerOutput = await runScenarios({
    file,
    scenarioFilePath: absolutePath,
    baseUrl: effectiveBaseUrl,
    stateproofVersion: options.stateproofVersion ?? STATEPROOF_VERSION,
    allowThirdParty: options.allowThirdParty,
    browserChannel: options.browserChannel,
    cdpUrl: options.cdpUrl,
    timeoutMsOverride: options.timeoutMs,
    failureBudgetMs: options.failureBudgetMs,
    failFast: options.failFast,
    artifactsRoot: options.artifactsRoot,
    updateBaselines: options.updateBaselines,
    diff: options.diff,
    baselineDir: options.baselineDir,
    diffThreshold: options.diffThreshold,
    workers: options.workers,
    headless: options.headless,
    selectedScenarioIds: selectedScenarios.map((s) => s.id),
    selectedViewportNames: selectedViewports.map((v) => v.name),
  });

  const result = runnerOutput.result;
  const rootDir = options.artifactsRoot ?? join(process.cwd(), 'artifacts', 'stateproof');
  const artifactDir = join(rootDir, file.name);

  // 5. Render card.md and card.json
  const cardMd = renderMarkdownCard({ name: file.name, result });
  const cardJson = buildJsonCard({ name: file.name, result });

  writeFileSync(join(artifactDir, 'card.md'), cardMd, 'utf-8');
  writeFileSync(join(artifactDir, 'card.json'), `${JSON.stringify(cardJson, null, 2)}\n`, 'utf-8');

  // 6. Write self-contained offline HTML report directory
  await writeHtmlReport({ result, artifactDir });

  // 7. Exit code calculation
  let exitCode: number;
  if (runnerOutput.fatal) {
    if (runnerOutput.fatal.kind === 'environment') {
      exitCode = 3;
    } else if (runnerOutput.fatal.kind === 'internal') {
      exitCode = 4;
    } else {
      exitCode = 2;
    }
  } else {
    exitCode = computeExitCode({ outcomes: result.scenarios });
  }

  const envelope = buildEnvelope<RunResult>({
    type: 'run.result',
    data: result,
    error: runnerOutput.fatal
      ? {
          code: runnerOutput.fatal.code,
          message: runnerOutput.fatal.message,
          hint: runnerOutput.fatal.hint,
          file: filePath,
          runId: result.runId,
        }
      : null,
    exitCode,
  });

  return {
    result,
    exitCode,
    fatal: runnerOutput.fatal,
    envelope,
    cardMd,
    cardJson,
    artifactDir,
  };
}
