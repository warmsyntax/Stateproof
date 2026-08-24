import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  assertFixtureContent,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_VIEWPORTS,
  type FailureCode,
  type Scenario,
  type ScenarioOutcome,
  type ScenarioFile,
  type Viewport,
} from '@stateproof/core';
import type { Browser, BrowserContext } from 'playwright';
import {
  type ArtifactPaths,
  acquireLock,
  artifactPaths,
  cleanGeneratedArtifacts,
  ensureArtifactDir,
  releaseLock,
} from './artifacts.js';
import { analyzeDomForSelectors } from './analyzer.js';
import { runVisualDiff } from './diff.js';
import { installInterceptor } from './interceptor.js';
import {
  SelectorTimeoutError,
  SelectorUnstableError,
  scrollFirstIntoView,
  sleep,
  waitForSelectors,
  waitStable,
} from './wait.js';

export interface RunOptions {
  file: ScenarioFile;
  scenarioFilePath: string;
  baseUrl: string;
  stateproofVersion: string;
  headless?: boolean | undefined;
  allowThirdParty?: boolean | undefined;
  selectedScenarioIds?: string[] | undefined;
  selectedViewportNames?: string[] | undefined;
  timeoutMsOverride?: number | undefined;
  artifactsRoot?: string | undefined;
  updateBaselines?: boolean | undefined;
  diff?: boolean | undefined;
  baselineDir?: string | undefined;
  diffThreshold?: number | undefined;
}

export type FatalKind = 'usage' | 'environment' | 'internal';

export interface RunFatal {
  kind: FatalKind;
  code: string;
  message: string;
  hint: string;
}

export interface RunResultData {
  schemaVersion: 1;
  runId: string;
  stateproofVersion: string;
  browserVersion: string;
  startedAt: string;
  finishedAt: string;
  baseUrl: string;
  file: string;
  scenarios: ScenarioOutcome[];
}

export interface RunOutput {
  result: RunResultData;
  fatal?: RunFatal;
}

interface TraceEntry {
  scenarioId: string;
  viewportName: string;
  detail: string;
}

class FixtureLoadError extends Error {
  constructor(
    readonly failureCode: Extract<FailureCode, 'fixture-missing' | 'fixture-invalid'>,
    message: string,
  ) {
    super(message);
    this.name = 'FixtureLoadError';
  }
}

const WATCHDOG_GRACE_MS = 10000;

function isLoopbackHostname(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname);
}

function selectorsOf(scenario: Scenario): string[] {
  return Array.isArray(scenario.expect.visible)
    ? [...scenario.expect.visible]
    : [scenario.expect.visible];
}

// Contract §6.2: navigation URL is exactly new URL(route, baseUrl), never "load".
function navigationUrlFor(baseUrl: string, route: string): string {
  return new URL(route, baseUrl).toString();
}

function loadFixtureBytes(scenarioFilePath: string, relativePath: string): Uint8Array {
  const baseDir = dirname(resolve(scenarioFilePath));
  const target = resolve(baseDir, relativePath);
  const resolvedBase = resolve(baseDir);
  const targetNormalized = process.platform === 'win32' ? target.toLowerCase() : target;
  const baseNormalized = process.platform === 'win32' ? resolvedBase.toLowerCase() : resolvedBase;
  if (!targetNormalized.startsWith(baseNormalized)) {
    throw new FixtureLoadError(
      'fixture-invalid',
      `fixture path escapes scenario directory: ${relativePath}`,
    );
  }
  if (!existsSync(target)) {
    throw new FixtureLoadError('fixture-missing', `fixture not found: ${relativePath}`);
  }
  return readFileSync(target);
}

async function createContext(
  browser: Browser,
  baseUrl: string,
  viewport: Viewport,
): Promise<BrowserContext> {
  const parsed = new URL(baseUrl);
  const httpsLoopback = parsed.protocol === 'https:' && isLoopbackHostname(parsed.hostname);
  return browser.newContext({
    serviceWorkers: 'block',
    locale: 'en-US',
    timezoneId: 'UTC',
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
    isMobile: viewport.isMobile ?? false,
    ...(httpsLoopback ? { ignoreHTTPSErrors: true } : {}),
  });
}

interface ComboArgs {
  browser: Browser;
  baseUrl: string;
  route: string;
  scenarioName: string;
  scenario: Scenario;
  viewport: Viewport;
  timeoutMs: number;
  allowThirdParty: boolean;
  paths: ArtifactPaths;
  scenarioFilePath: string;
  updateBaselines?: boolean | undefined;
  diff?: boolean | undefined;
  baselineDir?: string | undefined;
  diffThreshold?: number | undefined;
}

type ComboResult =
  | { kind: 'done'; outcome: ScenarioOutcome; trace?: string | undefined }
  | { kind: 'fatal'; fatal: RunFatal; outcome?: ScenarioOutcome | undefined };

async function executeCombo(args: ComboArgs): Promise<ComboResult> {
  const { browser, baseUrl, route, scenario, viewport, timeoutMs, paths } = args;
  const comboStartedAt = Date.now();
  const screenshotFile = `${scenario.id}.${viewport.name}.png`;

  const buildOutcome = (
    status: ScenarioOutcome['status'],
    extra: Partial<Omit<ScenarioOutcome, 'id' | 'viewport' | 'status' | 'durationMs'>> = {},
  ): ScenarioOutcome => ({
    id: scenario.id,
    ...(scenario.label === undefined ? {} : { label: scenario.label }),
    viewport,
    status,
    artifacts: {},
    durationMs: Date.now() - comboStartedAt,
    ...extra,
  });

  let fixtureBytes: Uint8Array | undefined;
  if (scenario.response.mode === 'fixture') {
    try {
      fixtureBytes = loadFixtureBytes(args.scenarioFilePath, scenario.response.path);
      assertFixtureContent(scenario.response.path, fixtureBytes);
      void fixtureBytes;
    } catch (error) {
      const spe = error as { code?: string; message?: string };
      if ('failureCode' in (error as object)) {
        const fle = error as FixtureLoadError;
        return {
          kind: 'done',
          outcome: buildOutcome('failed', {
            failureCode: fle.failureCode,
            message: fle.message,
            hint:
              fle.failureCode === 'fixture-missing'
                ? 'Create the fixture file or fix the path relative to the scenario file.'
                : 'Fix the fixture contents; .json fixtures must parse and stay under 1 MB.',
          }),
        };
      }
      return {
        kind: 'done',
        outcome: buildOutcome('failed', {
          failureCode: 'fixture-invalid',
          message: spe.message ?? 'fixture failed validation',
          hint: 'Fix the fixture contents; .json fixtures must parse and stay under 1 MB.',
        }),
      };
    }
  }

  const context = await createContext(browser, baseUrl, viewport);

  try {
    const page = await context.newPage();
    const origin = new URL(baseUrl).origin;
    const interceptor = installInterceptor(page, {
      baseUrlOrigin: origin,
      rule: scenario.request,
      response: scenario.response,
      fixtureBytes,
      allowThirdParty: args.allowThirdParty,
    });

    // Runs on every exit path: a held delay route must be aborted after capture.
    const finalizeInterceptor = async (): Promise<void> => {
      await interceptor.finalizeDelay();
    };

    const capture = async (
      status: ScenarioOutcome['status'],
      extra: Partial<
        Omit<ScenarioOutcome, 'id' | 'viewport' | 'status' | 'durationMs' | 'artifacts'>
      > = {},
    ): Promise<ScenarioOutcome> => {
      try {
        await page.screenshot({ path: paths.screenshot(scenario.id, viewport.name) });
        return buildOutcome(status, { ...extra, artifacts: { screenshot: screenshotFile } });
      } catch (error) {
        return buildOutcome('failed', {
          failureCode: 'capture-failed',
          message: `screenshot capture failed: ${error instanceof Error ? error.message : String(error)}`,
          hint: 'Retry the scenario; persistent capture failures usually mean the page closed mid-run.',
        });
      }
    };

    try {
      try {
        // A short expect.timeoutMs must not make navigation impossible; cold
        // contexts re-fetch the whole module graph. The expect budget itself
        // starts only after navigation settles.
        const gotoTimeout = Math.max(timeoutMs, 30000);
        await page.goto(navigationUrlFor(baseUrl, route), {
          waitUntil: 'domcontentloaded',
          timeout: gotoTimeout,
        });
      } catch (error) {
        return {
          kind: 'done',
          outcome: buildOutcome('failed', {
            failureCode: 'navigation-failed',
            message: `navigation to ${route} failed: ${error instanceof Error ? error.message : String(error)}`,
            hint: 'Verify the app is running and baseUrl/route are correct.',
          }),
        };
      }

      // Redirect guardrail (contract §9.2).
      const finalOrigin = new URL(page.url()).origin;
      if (finalOrigin !== origin) {
        const captured = await capture('error', {
          failureCode: 'non-loopback-redirect',
          message: `page redirected to non-loopback origin ${finalOrigin}`,
        });
        return {
          kind: 'fatal',
          fatal: {
            kind: 'usage',
            code: 'NON_LOOPBACK_REDIRECT',
            message: `Navigation redirected to non-loopback origin (${page.url()}).`,
            hint: 'Remove the redirect or pass --allow-remote if this target is intentional.',
          },
          outcome: captured,
        };
      }

      const selectors = selectorsOf(scenario);
      const deadline = Date.now() + timeoutMs;
      const remaining = () => Math.max(deadline - Date.now(), 0);

      try {
        await waitForSelectors(page, selectors, remaining());
      } catch (error) {
        if (!(error instanceof SelectorTimeoutError)) throw error;
        const analysis = await analyzeDomForSelectors(page);
        const suggestions =
          analysis.selectors.length > 0 ? { selectors: analysis.selectors } : undefined;
        const suggestionHint =
          analysis.hints.length > 0 ? `\n  suggest: ${analysis.selectors.join(', ')}` : '';
        return {
          kind: 'done',
          outcome: await capture('failed', {
            failureCode: 'selector-timeout',
            message: `selector not visible within ${timeoutMs}ms: ${error.selector}`,
            hint: `Ensure the UI renders "${error.selector}" in this state.${suggestionHint}`,
            ...(suggestions ? { suggestions } : {}),
          }),
        };
      }

      if (scenario.response.mode === 'delay') {
        if (!interceptor.interceptedOnce()) {
          return {
            kind: 'done',
            outcome: await capture('failed', {
              failureCode: 'request-not-intercepted',
              message: `no request matched ${scenario.request.method} ${scenario.request.urlPattern} before timeout`,
              hint: 'Check the method and urlPattern against what the app actually requests.',
            }),
          };
        }
        const interceptedAt = interceptor.interceptedAtMs() ?? comboStartedAt;
        if (scenario.response.mode === 'delay') {
          const holdUntil = Math.min(interceptedAt + scenario.response.milliseconds, deadline);
          while (Date.now() < holdUntil) {
            await sleep(50);
          }
        }
      }

      try {
        await waitStable(page, selectors, scenario.expect.stableMs ?? 0, remaining());
      } catch (error) {
        if (!(error instanceof SelectorUnstableError)) throw error;
        return {
          kind: 'done',
          outcome: await capture('failed', {
            failureCode: 'selector-unstable',
            message: 'selectors did not remain visible continuously for stableMs',
            hint: 'Stabilize the UI state or lower stableMs.',
          }),
        };
      }

      try {
        await scrollFirstIntoView(page, selectors[0] as string);
      } catch {
        // Element may already fill the viewport; capture proceeds regardless.
      }

      const captured = await capture('passed');

      // Visual Baseline Regression check if diff or updateBaselines is enabled
      if (args.diff || args.updateBaselines) {
        const screenshotPath = paths.screenshot(scenario.id, viewport.name);
        if (existsSync(screenshotPath)) {
          const screenshotBuffer = readFileSync(screenshotPath);
          const diffRes = runVisualDiff({
            scenarioName: args.scenarioName,
            scenarioId: scenario.id,
            viewportName: viewport.name,
            screenshotBuffer,
            baselineDir: args.baselineDir,
            artifactDir: paths.root,
            updateBaselines: args.updateBaselines,
            diffThreshold: args.diffThreshold,
          });

          if (diffRes.status === 'failed') {
            await finalizeInterceptor();
            return {
              kind: 'done',
              outcome: {
                ...captured,
                status: 'failed',
                failureCode: diffRes.failureCode ?? 'visual-diff-exceeded',
                message: diffRes.message ?? 'Visual diff exceeded threshold',
                hint: diffRes.hint ?? 'Inspect diff artifact',
                visualDiff: diffRes.visualDiff,
              },
            };
          }

          if (diffRes.visualDiff) {
            captured.visualDiff = diffRes.visualDiff;
          }
        }
      }

      const failures = interceptor.handlerFailures();
      const abortedLate = interceptor.laterMatchesAborted();
      await finalizeInterceptor();
      const traceLines: string[] = [];
      if (failures.length > 0) {
        traceLines.push('handler failures:', ...failures.map((line) => `- ${line}`));
      }
      if (abortedLate > 0) {
        traceLines.push(`later matching requests aborted after hold: ${abortedLate}`);
      }
      return traceLines.length > 0
        ? { kind: 'done', outcome: captured, trace: traceLines.join('\n') }
        : { kind: 'done', outcome: captured };
    } finally {
      await finalizeInterceptor().catch(() => undefined);
      await context.close().catch(() => undefined);
    }
  } catch (error) {
    // Anything escaping here is an unexpected runner fault, not a scenario verdict.
    return {
      kind: 'fatal',
      fatal: {
        kind: 'internal',
        code: 'INTERNAL_ERROR',
        message: `unexpected runner failure: ${error instanceof Error ? error.message : String(error)}`,
        hint: 'Inspect trace.md; if it persists, report with the runId attached.',
      },
    };
  }
}

export async function runScenarios(options: RunOptions): Promise<RunOutput> {
  const traces: TraceEntry[] = [];
  const outcomes: ScenarioOutcome[] = [];
  let fatal: RunFatal | undefined;

  const startedAtIso = new Date().toISOString();

  const viewports = (options.file.viewports ?? DEFAULT_VIEWPORTS).filter((viewport) =>
    options.selectedViewportNames === undefined || options.selectedViewportNames.length === 0
      ? true
      : options.selectedViewportNames.includes(viewport.name),
  );
  const scenarios = options.file.scenarios.filter((scenario) =>
    options.selectedScenarioIds === undefined || options.selectedScenarioIds.length === 0
      ? true
      : options.selectedScenarioIds.includes(scenario.id),
  );

  const rootDir = options.artifactsRoot ?? join('artifacts', 'stateproof');
  const paths = artifactPaths(join(rootDir, options.file.name));
  ensureArtifactDir(paths);
  cleanGeneratedArtifacts(paths);
  acquireLock(paths);

  let browser: Browser | null = null;
  try {
    const { chromium } = await import('playwright');
    try {
      browser = await chromium.launch({ headless: options.headless ?? true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/Executable doesn't exist|looks like Playwright/i.test(message)) {
        return finalize(
          options,
          outcomes,
          traces,
          {
            kind: 'environment',
            code: 'BROWSER_MISSING',
            message: 'Chromium could not be launched.',
            hint: 'Run "pnpm exec playwright install chromium" and retry.',
          },
          'unknown',
          startedAtIso,
          paths,
        );
      }
      throw error;
    }

    for (const scenario of scenarios) {
      for (const viewport of viewports) {
        if (fatal !== undefined) break;

        let liveContext: BrowserContext | null = null;
        const comboPromise = executeCombo({
          browser,
          baseUrl: options.baseUrl,
          route: options.file.route,
          scenarioName: options.file.name,
          scenario,
          viewport,
          timeoutMs: scenario.expect.timeoutMs ?? options.timeoutMsOverride ?? 15000,
          allowThirdParty: options.allowThirdParty ?? false,
          paths,
          scenarioFilePath: options.scenarioFilePath,
          updateBaselines: options.updateBaselines,
          diff: options.diff,
          baselineDir: options.baselineDir,
          diffThreshold: options.diffThreshold,
        }).then((result) => {
          liveContext = null;
          return result;
        });
        void liveContext;

        const budget =
          (scenario.expect.timeoutMs ?? options.timeoutMsOverride ?? 15000) +
          WATCHDOG_GRACE_MS +
          DEFAULT_TIMEOUT_MS;
        let combo: ComboResult;
        try {
          combo = await Promise.race([
            comboPromise,
            sleep(budget).then(() => {
              throw new Error(`watchdog: scenario exceeded ${budget}ms budget`);
            }),
          ]);
        } catch (watchdogError) {
          const detail =
            watchdogError instanceof Error ? watchdogError.message : String(watchdogError);
          traces.push({ scenarioId: scenario.id, viewportName: viewport.name, detail });
          outcomes.push({
            id: scenario.id,
            ...(scenario.label === undefined ? {} : { label: scenario.label }),
            viewport,
            status: 'error',
            failureCode: 'internal-error',
            message: detail,
            hint: 'Inspect trace.md for the failing run details.',
            artifacts: {},
            durationMs: budget,
          });
          continue;
        }

        if (combo.kind === 'fatal') {
          fatal = combo.fatal;
          if (combo.outcome !== undefined) outcomes.push(combo.outcome);
          break;
        }
        if (combo.trace !== undefined) {
          traces.push({
            scenarioId: scenario.id,
            viewportName: viewport.name,
            detail: combo.trace,
          });
        }
        outcomes.push(combo.outcome);
      }
      if (fatal !== undefined) break;
    }

    return finalize(options, outcomes, traces, fatal, browser.version(), startedAtIso, paths);
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    releaseLock(paths);
  }
}

function finalize(
  options: RunOptions,
  outcomes: ScenarioOutcome[],
  traces: TraceEntry[],
  fatal: RunFatal | undefined,
  browserVersion: string,
  startedAtIso: string,
  paths: ArtifactPaths,
): RunOutput {
  const result: RunResultData = {
    schemaVersion: 1,
    runId: randomUUID(),
    stateproofVersion: options.stateproofVersion,
    browserVersion,
    startedAt: startedAtIso,
    finishedAt: new Date().toISOString(),
    baseUrl: options.baseUrl,
    file: options.scenarioFilePath,
    scenarios: outcomes,
  };

  if (traces.length > 0 || fatal !== undefined) {
    const lines = [
      '# Stateproof trace',
      '',
      `- runId: ${result.runId}`,
      `- startedAt: ${startedAtIso}`,
      `- finishedAt: ${result.finishedAt}`,
      `- baseUrl: ${options.baseUrl}`,
      '',
      ...(fatal !== undefined ? ['## fatal', '', `${fatal.code}: ${fatal.message}`, ''] : []),
      ...traces.flatMap((entry) => [
        `## ${entry.scenarioId} · ${entry.viewportName}`,
        '',
        entry.detail,
        '',
      ]),
    ];
    writeFileSync(paths.traceMd, lines.join('\n'), 'utf-8');
  }

  writeFileSync(paths.runJson, `${JSON.stringify(result, null, 2)}\n`, 'utf-8');
  return fatal === undefined ? { result } : { result, fatal };
}
