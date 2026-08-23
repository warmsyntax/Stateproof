import { describe, expect, it } from 'vitest';
import { buildJsonCard, jsonCardEnvelope } from './card-json.js';
import { buildCardGrid, humanizeName, renderMarkdownCard } from './card-md.js';
import type { RunResult, ScenarioOutcome } from './types.js';

function outcome(
  id: string,
  viewportName: string,
  status: ScenarioOutcome['status'],
): ScenarioOutcome {
  const label = id === 'account-loading' ? 'Loading' : undefined;
  return {
    id,
    ...(label === undefined ? {} : { label }),
    viewport: {
      name: viewportName,
      width: viewportName === 'mobile' ? 390 : 1440,
      height: viewportName === 'mobile' ? 844 : 1024,
    },
    status,
    ...(status === 'failed'
      ? { failureCode: 'selector-timeout' as const, hint: 'render a retry control below 420px' }
      : {}),
    artifacts: status === 'error' ? {} : { screenshot: `${id}.${viewportName}.png` },
    durationMs: 1000,
  };
}

const baseResult: RunResult = {
  schemaVersion: 1,
  runId: '01J9ZKEXAMPLE',
  stateproofVersion: '0.1.0',
  browserVersion: '141',
  startedAt: '2026-08-23T14:02:10Z',
  finishedAt: '2026-08-23T14:02:15Z',
  baseUrl: 'http://localhost:5173',
  file: 'stateproof.scenarios.json',
  scenarios: [
    outcome('account-empty', 'desktop', 'passed'),
    outcome('account-empty', 'mobile', 'passed'),
    outcome('account-error', 'desktop', 'passed'),
    outcome('account-error', 'mobile', 'failed'),
    outcome('account-crash', 'desktop', 'error'),
  ],
};

const source = { result: baseResult, name: 'account-settings' };

describe('renderMarkdownCard', () => {
  const card = renderMarkdownCard(source);

  it('uses the contract heading and PASS/FAIL/ERROR vocabulary only', () => {
    expect(card).toContain('## Stateproof Card — Account Settings');
    expect(card).toContain('| account-empty | PASS | PASS |');
    expect(card).toContain('FAIL');
    expect(card).not.toMatch(/WARN|SKIP/);
  });

  it('orders columns by first appearance and one row per scenario', () => {
    expect(card).toContain('| State | desktop | mobile |');
    expect(card).toMatch(/\| account-crash \| ERROR \| ERROR \|/);
  });

  it('lists artifact basenames and the mandatory footer with runId', () => {
    expect(card).toContain('**Artifacts:** `artifacts/stateproof/account-settings/`');
    expect(card).toContain('account-error.mobile.png');
    expect(card).toContain('runId 01J9ZKEXAMPLE');
    expect(card).toContain('Stateproof 0.1.0 · Chromium 141');
    expect(card).toContain('2026-08-23T14:02:15Z');
  });

  it('escapes pipes in labels', () => {
    const weird = { ...source, result: { ...baseResult, scenarios: [] } };
    expect(() => renderMarkdownCard(weird)).not.toThrow();
    const labeled = renderMarkdownCard({
      result: {
        ...baseResult,
        scenarios: [outcome('a|b', 'desktop', 'passed')],
      },
      name: 'pipes',
    });
    expect(labeled).toContain('a\\|b');
  });

  it('honors an explicit title override', () => {
    expect(renderMarkdownCard({ ...source, title: 'My | title' })).toContain(
      '## Stateproof Card — My \\| title',
    );
  });
});

describe('buildCardGrid', () => {
  it('derives columns and per-scenario rows from outcomes', () => {
    const grid = buildCardGrid(baseResult);
    expect(grid.columns).toEqual(['desktop', 'mobile']);
    expect(grid.rows).toHaveLength(3);
    expect(grid.rows[0]?.cells).toEqual({ desktop: 'passed', mobile: 'passed' });
  });
});

describe('buildJsonCard', () => {
  const data = buildJsonCard(source);

  it('matches the contract export.card data shape', () => {
    expect(data.name).toBe('account-settings');
    expect(data.runId).toBe('01J9ZKEXAMPLE');
    expect(data.browserVersion).toBe('141');
    expect(data.finishedAt).toBe('2026-08-23T14:02:15Z');
    expect(data.columns).toEqual(['desktop', 'mobile']);
    expect(data.rows[0]?.cells).toEqual({ desktop: 'passed', mobile: 'passed' });
    expect(data.artifacts).toContain('account-error.desktop.png');
  });

  it('wraps in an envelope whose ok reflects the exit code', () => {
    expect(jsonCardEnvelope(source, 0).ok).toBe(true);
    const failedEnvelope = jsonCardEnvelope(source, 1);
    expect(failedEnvelope.ok).toBe(false);
    expect(failedEnvelope.type).toBe('export.card');
    expect(failedEnvelope.data).not.toBeNull();
  });

  it('humanizes kebab names for markdown titles', () => {
    expect(humanizeName('account-settings')).toBe('Account Settings');
  });
});
