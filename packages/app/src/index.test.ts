import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  executeExport,
  executeList,
  inspectFailure,
  resolveSelectedScenarios,
  resolveSelectedViewports,
  verifyLoopback,
} from './index.js';

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'stateproof-app-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

const sampleScenarioFile = {
  $schema: 'https://stateproof.dev/schema/v1.json',
  name: 'account-settings',
  baseUrl: 'http://localhost:5173',
  route: '/account',
  viewports: [
    { name: 'desktop', width: 1440, height: 1024 },
    { name: 'mobile', width: 390, height: 844 },
  ],
  scenarios: [
    {
      id: 'account-loading',
      label: 'Loading State',
      request: { method: 'GET', urlPattern: '**/api/account' },
      response: { mode: 'delay', milliseconds: 500 },
      expect: { visible: '[data-state="loading"]' },
    },
    {
      id: 'account-error',
      label: 'Error State',
      request: { method: 'GET', urlPattern: '**/api/account' },
      response: { mode: 'error', status: 500 },
      expect: { visible: '[data-state="error"]' },
    },
  ],
};

describe('@stateproof/app', () => {
  describe('executeList', () => {
    it('parses, validates, and returns list data and envelope', async () => {
      const dir = makeTempDir();
      const filePath = join(dir, 'stateproof.scenarios.json');
      writeFileSync(filePath, JSON.stringify(sampleScenarioFile, null, 2), 'utf-8');

      const listResult = await executeList({ file: filePath });
      expect(listResult.data.name).toBe('account-settings');
      expect(listResult.data.scenarios).toHaveLength(2);
      expect(listResult.envelope.type).toBe('list.result');
      expect(listResult.envelope.ok).toBe(true);
    });
  });

  describe('resolveSelectedScenarios & viewports', () => {
    it('resolves all scenarios when no filters provided', () => {
      const selected = resolveSelectedScenarios(sampleScenarioFile.scenarios as any, 'account-settings');
      expect(selected).toHaveLength(2);
    });

    it('resolves specific scenario id', () => {
      const selected = resolveSelectedScenarios(sampleScenarioFile.scenarios as any, 'account-settings', ['account-error']);
      expect(selected).toHaveLength(1);
      expect(selected[0]?.id).toBe('account-error');
    });

    it('resolves viewports', () => {
      const selected = resolveSelectedViewports(sampleScenarioFile.viewports as any, ['mobile']);
      expect(selected).toHaveLength(1);
      expect(selected[0]?.name).toBe('mobile');
    });
  });

  describe('executeExport & inspectFailure', () => {
    it('exports card and inspects failure from artifact directory', async () => {
      const dir = makeTempDir();
      const artifactDir = join(dir, 'account-settings');
      mkdirSync(artifactDir, { recursive: true });

      const cardMdContent = '## Stateproof Card\n| State | desktop |\n|---|:---:|\n| Error | FAIL |';
      writeFileSync(join(artifactDir, 'card.md'), cardMdContent, 'utf-8');

      const runJsonContent = {
        schemaVersion: 1,
        runId: 'test-run-123',
        stateproofVersion: '0.1.0',
        browserVersion: '141',
        startedAt: '2026-08-24T10:00:00Z',
        finishedAt: '2026-08-24T10:00:05Z',
        baseUrl: 'http://localhost:5173',
        file: 'stateproof.scenarios.json',
        scenarios: [
          {
            id: 'account-error',
            label: 'Error State',
            viewport: { name: 'mobile', width: 390, height: 844 },
            status: 'failed',
            failureCode: 'selector-timeout',
            message: 'selector not visible',
            hint: 'render a retry button',
            artifacts: { screenshot: 'account-error.mobile.png' },
            durationMs: 5000,
          },
        ],
      };
      writeFileSync(join(artifactDir, 'run.json'), JSON.stringify(runJsonContent, null, 2), 'utf-8');

      // Test export
      const exportResult = await executeExport({ run: artifactDir, format: 'md' });
      expect(exportResult.format).toBe('md');
      expect(exportResult.content).toContain('## Stateproof Card');
      expect(exportResult.envelope.type).toBe('export.card');

      // Test inspect failure
      const inspectResult = await inspectFailure({ run: artifactDir, scenario: 'account-error' });
      expect(inspectResult.data.runId).toBe('test-run-123');
      expect(inspectResult.data.failureCode).toBe('selector-timeout');
      expect(inspectResult.data.hint).toBe('render a retry button');
      expect(inspectResult.envelope.type).toBe('inspect.result');
    });
  });

  describe('verifyLoopback', () => {
    it('accepts localhost and loopback IPs', async () => {
      await expect(verifyLoopback('http://localhost:3000', false)).resolves.not.toThrow();
      await expect(verifyLoopback('http://127.0.0.1:8080', false)).resolves.not.toThrow();
      await expect(verifyLoopback('http://[::1]:5173', false)).resolves.not.toThrow();
    });

    it('rejects remote URLs without allowRemote', async () => {
      await expect(verifyLoopback('https://example.com', false)).rejects.toThrow();
    });

    it('allows remote URLs when allowRemote is true', async () => {
      await expect(verifyLoopback('https://example.com', true)).resolves.not.toThrow();
    });
  });
});
