import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, afterEach } from 'vitest';
import { runInit } from './commands/init.js';
import { runList } from './commands/list.js';
import { runExport } from './commands/export.js';
import { resolveSelectedScenarios, resolveSelectedViewports, runSecretAudit } from './commands/run.js';
import { isLoopbackIp, verifyLoopback } from './reachability.js';
import { formatDuration, renderHumanListSummary } from './reporters/human.js';
import type { Scenario, ScenarioFile } from '@stateproof/core';

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'stateproof-cli-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir && existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('reachability & loopback guardrail', () => {
  it('identifies loopback IPs correctly', () => {
    expect(isLoopbackIp('127.0.0.1')).toBe(true);
    expect(isLoopbackIp('127.1.2.3')).toBe(true);
    expect(isLoopbackIp('::1')).toBe(true);
    expect(isLoopbackIp('192.168.1.1')).toBe(false);
    expect(isLoopbackIp('8.8.8.8')).toBe(false);
  });

  it('allows localhost and 127.0.0.1 by default', async () => {
    await expect(verifyLoopback('http://localhost:3000', false)).resolves.toBeUndefined();
    await expect(verifyLoopback('http://127.0.0.1:5173', false)).resolves.toBeUndefined();
    await expect(verifyLoopback('https://127.0.0.1:8443', false)).resolves.toBeUndefined();
  });

  it('rejects 0.0.0.0 and remote domains without --allow-remote', async () => {
    await expect(verifyLoopback('http://0.0.0.0:3000', false)).rejects.toMatchObject({
      code: 'NON_LOOPBACK_URL',
    });
    await expect(verifyLoopback('https://api.example.com', false)).rejects.toMatchObject({
      code: 'NON_LOOPBACK_URL',
    });
  });

  it('allows remote domains when allowRemote is true', async () => {
    const warnings: string[] = [];
    await expect(
      verifyLoopback('https://example.com', true, (msg) => warnings.push(msg)),
    ).resolves.toBeUndefined();
  });
});

describe('init command', () => {
  it('scaffolds scenario file, fixtures dir, and gitignore entry', async () => {
    const dir = makeTempDir();
    const filePath = join(dir, 'custom.scenarios.json');

    const exitCode = await runInit({ file: filePath, url: 'http://localhost:4000', route: '/app' });
    expect(exitCode).toBe(0);
    expect(existsSync(filePath)).toBe(true);
    expect(existsSync(join(dir, 'fixtures'))).toBe(true);

    const parsed = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(parsed.baseUrl).toBe('http://localhost:4000');
    expect(parsed.route).toBe('/app');
    expect(parsed.$schema).toBe('https://stateproof.dev/schema/v1.json');
    expect(parsed.scenarios).toHaveLength(1);
    expect(parsed.scenarios[0].note).toBeDefined();
  });

  it('refuses overwrite without --force', async () => {
    const dir = makeTempDir();
    const filePath = join(dir, 'stateproof.scenarios.json');
    writeFileSync(filePath, '{"exists":true}', 'utf-8');

    await expect(runInit({ file: filePath, force: false })).rejects.toMatchObject({
      code: 'SCHEMA_INVALID',
      hint: expect.stringContaining('--force'),
    });
  });

  it('overwrites existing file with --force', async () => {
    const dir = makeTempDir();
    const filePath = join(dir, 'stateproof.scenarios.json');
    writeFileSync(filePath, '{"exists":true}', 'utf-8');

    const exitCode = await runInit({ file: filePath, force: true });
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(parsed.name).toBeDefined();
  });
});

describe('list command', () => {
  it('rejects when scenario file is missing', async () => {
    const dir = makeTempDir();
    await expect(runList({ file: join(dir, 'missing.json') })).rejects.toMatchObject({
      code: 'SCENARIO_FILE_MISSING',
    });
  });

  it('rejects invalid JSON syntax', async () => {
    const dir = makeTempDir();
    const filePath = join(dir, 'invalid.json');
    writeFileSync(filePath, '{ bad json }', 'utf-8');

    await expect(runList({ file: filePath })).rejects.toMatchObject({
      code: 'SCENARIO_FILE_INVALID_JSON',
    });
  });

  it('rejects schema violation', async () => {
    const dir = makeTempDir();
    const filePath = join(dir, 'bad-schema.json');
    writeFileSync(filePath, JSON.stringify({ name: 'ValidName' }), 'utf-8');

    await expect(runList({ file: filePath })).rejects.toMatchObject({
      code: 'SCHEMA_INVALID',
    });
  });

  it('validates and lists a valid scenario file', async () => {
    const dir = makeTempDir();
    const filePath = join(dir, 'stateproof.scenarios.json');
    const valid: ScenarioFile = {
      name: 'test-screen',
      baseUrl: 'http://localhost:3000',
      route: '/test',
      scenarios: [
        {
          id: 'test-state',
          label: 'Test State',
          request: { method: 'GET', urlPattern: '**/api/test' },
          response: { mode: 'offline' },
          expect: { visible: '.loaded' },
        },
      ],
    };
    writeFileSync(filePath, JSON.stringify(valid, null, 2), 'utf-8');

    const exitCode = await runList({ file: filePath });
    expect(exitCode).toBe(0);
  });
});

describe('run command filters and secret audit', () => {
  const scenarios: Scenario[] = [
    {
      id: 'scen-a',
      request: { method: 'GET', urlPattern: '**/api/a' },
      response: { mode: 'inline', body: { user: 'test' } },
      expect: { visible: '.a' },
    },
    {
      id: 'scen-b',
      request: { method: 'GET', urlPattern: '**/api/b' },
      response: { mode: 'offline' },
      expect: { visible: '.b' },
    },
  ];

  it('resolves all scenarios when no filters are passed', () => {
    expect(resolveSelectedScenarios(scenarios, 'my-file', [], [])).toHaveLength(2);
  });

  it('resolves all scenarios when single positional matches file name', () => {
    expect(resolveSelectedScenarios(scenarios, 'my-file', ['my-file'], [])).toHaveLength(2);
  });

  it('filters by scenario ids', () => {
    const selected = resolveSelectedScenarios(scenarios, 'my-file', ['scen-b'], []);
    expect(selected).toHaveLength(1);
    expect(selected[0]?.id).toBe('scen-b');
  });

  it('throws NO_SCENARIOS_SELECTED for unknown id', () => {
    expect(() => resolveSelectedScenarios(scenarios, 'my-file', ['nonexistent'], [])).toThrowError(
      expect.objectContaining({ code: 'NO_SCENARIOS_SELECTED' }),
    );
  });

  it('filters viewports correctly', () => {
    const viewports = [
      { name: 'desktop', width: 1440, height: 1024 },
      { name: 'mobile', width: 390, height: 844 },
    ];
    const selected = resolveSelectedViewports(viewports, ['mobile']);
    expect(selected).toHaveLength(1);
    expect(selected[0]?.name).toBe('mobile');
  });

  it('secret audit warns by default and fails under strictSecrets', () => {
    const dir = makeTempDir();
    const leakScenarios: Scenario[] = [
      {
        id: 'leaky',
        request: { method: 'GET', urlPattern: '**/api' },
        response: { mode: 'inline', body: { token: 'sk-1234567890123456789012345678901234567890' } },
        expect: { visible: '.token' },
      },
    ];

    const warnings: string[] = [];
    runSecretAudit(leakScenarios, join(dir, 'test.json'), false, (msg) => warnings.push(msg));
    expect(warnings.length).toBeGreaterThan(0);

    expect(() => runSecretAudit(leakScenarios, join(dir, 'test.json'), true)).toThrowError(
      expect.objectContaining({ code: 'SECRET_SCAN_FAILED' }),
    );
  });
});

describe('export command', () => {
  it('throws EXPORT_RUN_MISSING if no artifact directory is found', async () => {
    const dir = makeTempDir();
    await expect(runExport({ run: join(dir, 'nonexistent') })).rejects.toMatchObject({
      code: 'EXPORT_RUN_MISSING',
    });
  });

  it('exports card markdown when run.json exists in target directory', async () => {
    const dir = makeTempDir();
    const artifactDir = join(dir, 'artifacts', 'stateproof', 'my-run');
    mkdirSync(artifactDir, { recursive: true });

    const runResult = {
      schemaVersion: 1,
      runId: '12345678-1234-1234-1234-123456789012',
      stateproofVersion: '0.1.0',
      browserVersion: '141',
      startedAt: '2026-08-23T10:00:00.000Z',
      finishedAt: '2026-08-23T10:00:05.000Z',
      baseUrl: 'http://localhost:3000',
      file: 'stateproof.scenarios.json',
      scenarios: [
        {
          id: 'loading',
          label: 'Loading',
          viewport: { name: 'desktop', width: 1440, height: 1024 },
          status: 'passed',
          artifacts: { screenshot: 'loading.desktop.png' },
          durationMs: 1200,
        },
      ],
    };
    writeFileSync(join(artifactDir, 'run.json'), JSON.stringify(runResult, null, 2), 'utf-8');

    const exitCode = await runExport({ run: artifactDir, format: 'md' });
    expect(exitCode).toBe(0);
  });
});

describe('human reporter helpers', () => {
  it('formats durations cleanly', () => {
    expect(formatDuration(450)).toBe('450ms');
    expect(formatDuration(1500)).toBe('1.5s');
    expect(formatDuration(15200)).toBe('15.2s');
  });

  it('renders human list summary', () => {
    const summary = renderHumanListSummary({
      name: 'demo-app',
      baseUrl: 'http://localhost:5173',
      route: '/',
      scenarios: [
        { id: 'scen-1', label: 'First', note: 'Primary test', request: { method: 'GET', urlPattern: '**/api' } },
      ],
    });
    expect(summary).toContain('demo-app');
    expect(summary).toContain('scen-1');
  });
});
