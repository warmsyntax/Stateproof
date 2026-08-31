import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer as createHttpServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ScenarioFile, ScenarioOutcome } from '@stateproof-dev/core';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { runScenarios } from '../run.js';

vi.setConfig({ testTimeout: 180000, hookTimeout: 180000 });

const EXAMPLE_ROOT = fileURLToPath(
  new URL('../../../../examples/react-vite-demo', import.meta.url),
);
const SCENARIO_FILE_NAME = 'stateproof.scenarios.json';
const EMPTY_FIXTURE = '{\n  "account": null\n}\n';

let vite: ViteDevServer;
let beacon: Server;
let baseUrl = '';
let beaconOrigin = '';
let artifactsRoot = '';
let browserVersionSeen = '';

const DESKTOP_ONLY = [
  { name: 'desktop', width: 1440, height: 1024, deviceScaleFactor: 1, isMobile: false },
];

function makeTestArtifactsRoot(): string {
  return mkdtempSync(join(tmpdir(), 'stateproof-integration-'));
}

function scenarioFile(overrides?: Partial<ScenarioFile>): ScenarioFile {
  return {
    name: 'account-settings',
    baseUrl,
    route: '/',
    viewports: DESKTOP_ONLY,
    scenarios: [
      {
        id: 'probe',
        request: { method: 'GET', urlPattern: '**/api/account' },
        response: { mode: 'offline' },
        expect: { visible: "[data-state='offline']", timeoutMs: 8000 },
      },
    ],
    ...overrides,
  };
}

function single(
  scenario: ScenarioFile['scenarios'][number],
  overrides?: Partial<ScenarioFile>,
): ScenarioFile {
  const file = scenarioFile({ ...overrides, scenarios: [scenario] });
  writeFileSync(
    join(EXAMPLE_ROOT, SCENARIO_FILE_NAME),
    `${JSON.stringify(file, null, 2)}\n`,
    'utf-8',
  );
  return file;
}

function outcomeOf(output: Awaited<ReturnType<typeof runScenarios>>): ScenarioOutcome {
  expect(output.result.scenarios).toHaveLength(1);
  return output.result.scenarios[0] as ScenarioOutcome;
}

async function run(
  file: ScenarioFile,
  extra?: { allowThirdParty?: boolean; artifactsRoot?: string },
) {
  const targetArtifactsRoot = extra?.artifactsRoot ?? artifactsRoot;
  const output = await runScenarios({
    file,
    scenarioFilePath: join(EXAMPLE_ROOT, SCENARIO_FILE_NAME),
    baseUrl: file.baseUrl,
    stateproofVersion: '0.1.3-test',
    artifactsRoot: targetArtifactsRoot,
    ...extra,
  });
  browserVersionSeen = output.result.browserVersion;
  return output;
}

const VALID_1X1_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

beforeAll(async () => {
  beacon = createHttpServer((req, res) => {
    if (req.url?.includes('/beacon.png')) {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(VALID_1X1_PNG);
      return;
    }
    res.statusCode = 404;
    res.end();
  });
  await new Promise<void>((resolveListen) => beacon.listen(0, '127.0.0.1', resolveListen));
  const address = beacon.address();
  if (address === null || typeof address === 'string') throw new Error('beacon server failed');
  beaconOrigin = `http://127.0.0.1:${address.port}`;

  process.env.DEMO_BEACON_ORIGIN = beaconOrigin;

  mkdirSync(join(EXAMPLE_ROOT, 'fixtures'), { recursive: true });
  writeFileSync(join(EXAMPLE_ROOT, 'fixtures', 'account-empty.json'), EMPTY_FIXTURE, 'utf-8');

  vite = await createViteServer({
    root: EXAMPLE_ROOT,
    logLevel: 'silent',
    server: {
      strictPort: false,
      watch: {
        ignored: ['**/stateproof.scenarios.json', '**/fixtures/**', '**/artifacts/**', '**/.lock'],
      },
    },
  });
  await vite.listen();
  const local = vite.resolvedUrls?.local[0];
  if (local === undefined) throw new Error('vite did not expose a local url');
  baseUrl = local.replace('127.0.0.1', 'localhost').replace(/\/$/, '');

  // Pre-warm Vite compilation pipeline and Chromium instance
  try {
    const { chromium } = await import('playwright');
    const warmupBrowser = await chromium.launch({ headless: true, timeout: 15000 });
    try {
      const page = await warmupBrowser.newPage();
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.close();
    } catch {
      // Ignore warmup errors
    } finally {
      await warmupBrowser.close().catch(() => undefined);
    }
  } catch {
    await fetch(baseUrl).catch(() => undefined);
  }
});

beforeEach(() => {
  artifactsRoot = makeTestArtifactsRoot();
});

afterEach(() => {
  if (artifactsRoot && existsSync(artifactsRoot)) {
    rmSync(artifactsRoot, { recursive: true, force: true });
  }
});

afterAll(async () => {
  await vite?.close();
  await new Promise<void>((resolveClose) => {
    if (beacon) {
      beacon.close(() => resolveClose());
    } else {
      resolveClose();
    }
  });
  if (artifactsRoot && existsSync(artifactsRoot)) {
    rmSync(artifactsRoot, { recursive: true, force: true });
  }
  const canonicalScenarios: ScenarioFile = {
    name: 'account-settings',
    baseUrl: 'http://localhost:5173',
    route: '/',
    viewports: [
      { name: 'desktop', width: 1440, height: 1024, deviceScaleFactor: 1, isMobile: false },
      { name: 'mobile', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
    ],
    scenarios: [
      {
        id: 'account-loading',
        label: 'Loading State',
        request: { method: 'GET', urlPattern: '**/api/account' },
        response: { mode: 'delay', milliseconds: 500 },
        expect: { visible: "[data-state='loading']" },
      },
      {
        id: 'account-empty',
        label: 'Empty State',
        request: { method: 'GET', urlPattern: '**/api/account' },
        response: { mode: 'fixture', path: 'fixtures/account-empty.json' },
        expect: { visible: "[data-state='empty']" },
      },
      {
        id: 'account-ready',
        label: 'Populated State',
        request: { method: 'GET', urlPattern: '**/api/account' },
        response: { mode: 'inline', body: { account: { name: 'Ada Lovelace', plan: 'trial' } } },
        expect: { visible: "[data-state='ready']" },
      },
      {
        id: 'account-error',
        label: 'Error State with Retry Action',
        request: { method: 'GET', urlPattern: '**/api/account' },
        response: { mode: 'error', status: 500 },
        expect: { visible: ["[data-state='error']", "[data-testid='retry']"] },
      },
      {
        id: 'account-offline',
        label: 'Network Offline State',
        request: { method: 'GET', urlPattern: '**/api/account' },
        response: { mode: 'offline' },
        expect: { visible: ["[data-state='offline']", "[data-testid='retry']"] },
      },
    ],
  };
  writeFileSync(
    join(EXAMPLE_ROOT, SCENARIO_FILE_NAME),
    `${JSON.stringify(canonicalScenarios, null, 2)}\n`,
    'utf-8',
  );
});

describe('runner integration vs examples/react-vite-demo', () => {
  it('fixture pass: empty fixture renders the empty state', async () => {
    const output = await run(
      single({
        id: 'empty-fixture',
        request: { method: 'GET', urlPattern: '**/api/account' },
        response: { mode: 'fixture', path: 'fixtures/account-empty.json', status: 200 },
        expect: { visible: "[data-state='empty']", timeoutMs: 15000 },
      }),
    );
    const outcome = outcomeOf(output);
    expect(outcome.status).toBe('passed');
    expect(outcome.artifacts.screenshot).toBe('empty-fixture.desktop.png');
    expect(
      existsSync(join(artifactsRoot, 'account-settings', outcome.artifacts.screenshot ?? '')),
    ).toBe(true);
  });

  it('fixture fail: wrong selector times out and leaves a failure screenshot', async () => {
    const output = await run(
      single({
        id: 'empty-fixture-bad',
        request: { method: 'GET', urlPattern: '**/api/account' },
        response: { mode: 'fixture', path: 'fixtures/account-empty.json' },
        expect: { visible: '[data-state=does-not-exist]', timeoutMs: 1500 },
      }),
    );
    const outcome = outcomeOf(output);
    expect(outcome.status).toBe('failed');
    expect(outcome.failureCode).toBe('selector-timeout');
    expect(
      existsSync(join(artifactsRoot, 'account-settings', 'empty-fixture-bad.desktop.png')),
    ).toBe(true);
  });

  it('inline pass and inline fail', async () => {
    const pass = outcomeOf(
      await run(
        single({
          id: 'inline-pass',
          request: { method: 'GET', urlPattern: '**/api/account' },
          response: { mode: 'inline', status: 200, body: { account: null } },
          expect: { visible: "[data-state='empty']", timeoutMs: 8000 },
        }),
      ),
    );
    expect(pass.status).toBe('passed');

    const fail = outcomeOf(
      await run(
        single({
          id: 'inline-fail',
          request: { method: 'GET', urlPattern: '**/api/account' },
          response: { mode: 'inline', status: 200, body: { account: null } },
          expect: { visible: '[data-state=nope]', timeoutMs: 1200 },
        }),
      ),
    );
    expect(fail.status).toBe('failed');
    expect(fail.failureCode).toBe('selector-timeout');
  });

  it('error pass: 500 renders the error branch with retry control at desktop', async () => {
    const output = await run(
      single({
        id: 'error-pass',
        request: { method: 'GET', urlPattern: '**/api/account' },
        response: { mode: 'error', status: 500, body: { message: 'boom' } },
        expect: {
          visible: ["[data-state='error']", "[data-testid='retry']"],
          timeoutMs: 8000,
        },
      }),
    );
    expect(outcomeOf(output).status).toBe('passed');
  });

  it('error fail: the mobile retry bug hides the retry control below 420px', async () => {
    const output = await run(
      single(
        {
          id: 'error-mobile-bug',
          request: { method: 'GET', urlPattern: '**/api/account' },
          response: { mode: 'error', status: 500 },
          expect: {
            visible: ["[data-state='error']", "[data-testid='retry']"],
            timeoutMs: 4000,
          },
        },
        {
          viewports: [
            { name: 'mobile', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
          ],
        },
      ),
    );
    const outcome = outcomeOf(output);
    expect(outcome.status).toBe('failed');
    expect(outcome.failureCode).toBe('selector-timeout');
    expect(outcome.message).toContain("[data-testid='retry']");
  });

  it('offline pass and offline fail via request-level aborts', async () => {
    const pass = outcomeOf(
      await run(single(scenarioFile().scenarios[0] as ScenarioFile['scenarios'][number])),
    );
    expect(pass.status).toBe('passed');

    const fail = outcomeOf(
      await run(
        single({
          id: 'offline-bad',
          request: { method: 'GET', urlPattern: '**/api/account' },
          response: { mode: 'offline' },
          expect: { visible: '[data-state=ghost]', timeoutMs: 1200 },
        }),
      ),
    );
    expect(fail.status).toBe('failed');
    expect(fail.failureCode).toBe('selector-timeout');
  });

  it('delay pass holds the loading UI for the configured duration then captures', async () => {
    const output = await run(
      single({
        id: 'delay-hold',
        request: { method: 'GET', urlPattern: '**/api/account' },
        response: { mode: 'delay', milliseconds: 700 },
        expect: { visible: "[data-state='loading']", timeoutMs: 8000 },
      }),
    );
    const outcome = outcomeOf(output);
    expect(outcome.status).toBe('passed');
    expect(outcome.durationMs).toBeGreaterThanOrEqual(650);
    expect(existsSync(join(artifactsRoot, 'account-settings', 'delay-hold.desktop.png'))).toBe(
      true,
    );
  });

  it('delay fail: pending request does not mask a selector timeout', async () => {
    const output = await run(
      single({
        id: 'delay-bad-selector',
        request: { method: 'GET', urlPattern: '**/api/account' },
        response: { mode: 'delay', milliseconds: 5000 },
        expect: { visible: '[data-state=purgatory]', timeoutMs: 1300 },
      }),
    );
    const outcome = outcomeOf(output);
    expect(outcome.status).toBe('failed');
    expect(outcome.failureCode).toBe('selector-timeout');
  });

  it('non-matching method passes through to the real endpoint', async () => {
    const output = await run(
      single({
        id: 'passthrough-delete',
        request: { method: 'DELETE', urlPattern: '**/api/account' },
        response: { mode: 'inline', status: 200, body: { hijacked: true } },
        expect: { visible: "[data-testid='account-name']", timeoutMs: 8000 },
      }),
    );
    expect(outcomeOf(output).status).toBe('passed');
  });

  it('third-party requests are blocked by default and allowed with the flag', async () => {
    const blocked = outcomeOf(
      await run(
        single({
          id: 'beacon-blocked',
          request: { method: 'GET', urlPattern: '**/never-called' },
          response: { mode: 'offline' },
          expect: { visible: "[data-beacon='failed']", timeoutMs: 8000 },
        }),
      ),
    );
    expect(blocked.status).toBe('passed');

    const allowed = outcomeOf(
      await run(
        single({
          id: 'beacon-allowed',
          request: { method: 'GET', urlPattern: '**/never-called' },
          response: { mode: 'offline' },
          expect: { visible: "[data-beacon='loaded']", timeoutMs: 8000 },
        }),
        { allowThirdParty: true },
      ),
    );
    expect(allowed.status).toBe('passed');
  });

  it('navigation failure maps to navigation-failed without hanging', async () => {
    const deadFile = single({
      id: 'dead-target',
      request: { method: 'GET', urlPattern: '**/api/account' },
      response: { mode: 'offline' },
      expect: { visible: '.anything', timeoutMs: 1000 },
    });
    const output = await run({ ...deadFile, baseUrl: 'http://localhost:9' });
    const outcome = outcomeOf(output);
    expect(outcome.status).toBe('failed');
    expect(outcome.failureCode).toBe('navigation-failed');
  });

  it('repeated context churn never hangs (10 scenarios in one run)', async () => {
    const scenarios = Array.from({ length: 10 }, (_, index) => ({
      id: `repeat-${index}`,
      request: { method: 'GET' as const, urlPattern: '**/api/account' },
      response: { mode: 'offline' as const },
      expect: { visible: "[data-state='offline']", timeoutMs: 10000 },
    }));
    const output = await run(scenarioFile({ scenarios }));
    expect(output.result.scenarios).toHaveLength(10);
    expect(output.result.scenarios.every((scenario) => scenario.status === 'passed')).toBe(true);
  });

  it('writes run.json with reproducibility metadata', async () => {
    const output = await run(
      single(scenarioFile().scenarios[0] as ScenarioFile['scenarios'][number]),
    );
    expect(output.result.runId).toMatch(/^[0-9a-f-]{36}$/);
    expect(output.result.schemaVersion).toBe(1);
    expect(browserVersionSeen).not.toBe('');
    const raw = await import('node:fs');
    const written = JSON.parse(
      raw.readFileSync(join(artifactsRoot, 'account-settings', 'run.json'), 'utf-8') as string,
    ) as { runId: string };
    expect(written.runId).toBe(output.result.runId);
  });

  it('refuses to run while another run owns the artifact directory', async () => {
    const lockDir = join(artifactsRoot, 'account-settings');
    mkdirSync(lockDir, { recursive: true });
    const lockPath = join(lockDir, '.lock');
    writeFileSync(lockPath, 'held', 'utf-8');
    try {
      await expect(
        run(single(scenarioFile().scenarios[0] as ScenarioFile['scenarios'][number])),
      ).rejects.toMatchObject({ code: 'ARTIFACT_LOCKED' });
    } finally {
      if (existsSync(lockPath)) rmSync(lockPath, { force: true });
    }
  });
});
