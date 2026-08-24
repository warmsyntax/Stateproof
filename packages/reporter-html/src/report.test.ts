import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RunResult } from '@stateproof/core';
import { afterEach, describe, expect, it } from 'vitest';
import { escapeHtml } from './escape.js';
import { renderHtmlReport } from './render.js';
import { writeHtmlReport } from './write.js';

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'stateproof-report-test-'));
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

const sampleResult: RunResult = {
  schemaVersion: 1,
  runId: '11111111-2222-3333-4444-555555555555',
  stateproofVersion: '0.1.0',
  browserVersion: '141',
  startedAt: '2026-08-23T14:02:00.000Z',
  finishedAt: '2026-08-23T14:02:10.000Z',
  baseUrl: 'http://localhost:5173',
  file: 'stateproof.scenarios.json',
  scenarios: [
    {
      id: 'account-loading',
      label: 'Loading State',
      viewport: { name: 'desktop', width: 1440, height: 1024 },
      status: 'passed',
      artifacts: { screenshot: 'account-loading.desktop.png' },
      durationMs: 750,
    },
    {
      id: 'account-loading',
      label: 'Loading State',
      viewport: { name: 'mobile', width: 390, height: 844 },
      status: 'passed',
      artifacts: { screenshot: 'account-loading.mobile.png' },
      durationMs: 650,
    },
    {
      id: 'account-error',
      label: 'Error State',
      viewport: { name: 'desktop', width: 1440, height: 1024 },
      status: 'passed',
      artifacts: { screenshot: 'account-error.desktop.png' },
      durationMs: 800,
    },
    {
      id: 'account-error',
      label: 'Error State',
      viewport: { name: 'mobile', width: 390, height: 844 },
      status: 'failed',
      failureCode: 'selector-timeout',
      message: 'selector not visible within 8000ms: [data-testid="retry"]',
      hint: 'render a retry control below 420px',
      artifacts: { screenshot: 'account-error.mobile.png' },
      durationMs: 8200,
    },
  ],
};

describe('escapeHtml', () => {
  it('escapes &, <, >, ", and single quotes', () => {
    expect(escapeHtml('<div>"Hello" & \'World\'</div>')).toBe(
      '&lt;div&gt;&quot;Hello&quot; &amp; &#39;World&#39;&lt;/div&gt;',
    );
  });

  it('handles null, undefined, and non-strings safely', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(1234)).toBe('1234');
    expect(escapeHtml(true)).toBe('true');
  });
});

describe('renderHtmlReport (contract §10.4)', () => {
  it('renders a valid HTML5 document', () => {
    const html = renderHtmlReport(sampleResult);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('Stateproof Report — stateproof.scenarios.json');
    expect(html).toContain('STATEPROOF / RUNTIME VALIDATION REPORT');
  });

  it('contains zero <script> tags', () => {
    const html = renderHtmlReport(sampleResult);
    expect(html).not.toMatch(/<script\b/i);
    expect(html).not.toMatch(/onload\s*=/i);
    expect(html).not.toMatch(/onclick\s*=/i);
    expect(html).not.toMatch(/onerror\s*=/i);
  });

  it('contains zero external network URLs in styles or links', () => {
    const html = renderHtmlReport(sampleResult);
    // Exclude the baseUrl displayed in the header link
    const externalRefs = html.match(/(?:href|src|url)\s*=\s*["']https?:\/\/[^"']+["']/gi) ?? [];
    const filtered = externalRefs.filter((ref) => !ref.includes('localhost'));
    expect(filtered).toHaveLength(0);
    expect(html).not.toMatch(/@import\s+url\(/i);
    expect(html).not.toMatch(/<link\s+rel=["']stylesheet["']/i);
  });

  it('escapes all user-controlled dynamic strings to prevent XSS', () => {
    const xssResult: RunResult = {
      ...sampleResult,
      file: '<script>alert("xss")</script>',
      baseUrl: 'http://localhost:3000/<script>',
      scenarios: [
        {
          id: '<img src=x onerror=alert(1)>',
          label: '<b onclick="evil()">Attack</b>',
          viewport: { name: '"><script>alert(2)</script>', width: 1440, height: 1024 },
          status: 'failed',
          failureCode: 'selector-timeout',
          message: '<script>alert(3)</script>',
          hint: '<script>alert(4)</script>',
          artifacts: { screenshot: 'attack.png' },
          durationMs: 100,
        },
      ],
    };

    const html = renderHtmlReport(xssResult);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<script>alert(');
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<b onclick=');
    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&lt;b onclick=&quot;evil()&quot;&gt;Attack&lt;/b&gt;');
  });

  it('includes proper accessibility markup for tables and images', () => {
    const html = renderHtmlReport(sampleResult);
    expect(html).toContain('<th scope="col">');
    expect(html).toContain('<th scope="row" class="sp-scenario-cell">');
    expect(html).toContain('alt="Loading State on desktop viewport (1440x1024) - status: passed"');
  });

  it('renders visual diff evidence when visualDiff is present', () => {
    const visualDiffResult: RunResult = {
      ...sampleResult,
      scenarios: [
        {
          id: 'account-loading',
          label: 'Loading State',
          viewport: { name: 'desktop', width: 1440, height: 1024 },
          status: 'failed',
          failureCode: 'visual-diff-exceeded',
          message: 'Visual diff exceeded threshold (1.20% > 0.10%)',
          hint: 'Inspect diff artifact',
          visualDiff: {
            baseline: 'account-loading.desktop.baseline.png',
            current: 'account-loading.desktop.current.png',
            diff: 'account-loading.desktop.diff.png',
            diffRatio: 0.012,
            threshold: 0.001,
          },
          artifacts: { screenshot: 'account-loading.desktop.png' },
          durationMs: 500,
        },
      ],
    };

    const html = renderHtmlReport(visualDiffResult);
    expect(html).toContain('Visual Diff Evidence');
    expect(html).toContain('account-loading.desktop.baseline.png');
    expect(html).toContain('account-loading.desktop.current.png');
    expect(html).toContain('account-loading.desktop.diff.png');
    expect(html).toContain('1.20%');
  });
});

describe('writeHtmlReport', () => {
  it('creates report/index.html and copies screenshot assets including visual diffs', async () => {
    const dir = makeTempDir();
    const artifactDir = join(dir, 'account-settings');
    mkdirSync(artifactDir, { recursive: true });

    // Create dummy screenshots in artifactDir
    writeFileSync(join(artifactDir, 'account-loading.desktop.png'), 'fake-png-1', 'utf-8');
    writeFileSync(join(artifactDir, 'account-loading.mobile.png'), 'fake-png-2', 'utf-8');
    writeFileSync(join(artifactDir, 'account-error.desktop.png'), 'fake-png-3', 'utf-8');
    writeFileSync(join(artifactDir, 'account-error.mobile.png'), 'fake-png-4', 'utf-8');
    writeFileSync(join(artifactDir, 'account-loading.desktop.baseline.png'), 'fake-baseline', 'utf-8');
    writeFileSync(join(artifactDir, 'account-loading.desktop.diff.png'), 'fake-diff', 'utf-8');

    const resultWithDiff: RunResult = {
      ...sampleResult,
      scenarios: [
        {
          ...sampleResult.scenarios[0]!,
          visualDiff: {
            baseline: 'account-loading.desktop.baseline.png',
            diff: 'account-loading.desktop.diff.png',
          },
        },
        ...sampleResult.scenarios.slice(1),
      ],
    };

    const result = await writeHtmlReport({
      result: resultWithDiff,
      artifactDir,
    });

    expect(result.assetCount).toBe(6);
    expect(existsSync(result.htmlPath)).toBe(true);
    expect(existsSync(join(result.assetsDir, 'account-loading.desktop.png'))).toBe(true);
    expect(existsSync(join(result.assetsDir, 'account-loading.desktop.baseline.png'))).toBe(true);
    expect(existsSync(join(result.assetsDir, 'account-loading.desktop.diff.png'))).toBe(true);

    const writtenHtml = readFileSync(result.htmlPath, 'utf-8');
    expect(writtenHtml).toContain('Stateproof Report');
    expect(writtenHtml).toContain('account-loading.desktop.png');
  });
});
