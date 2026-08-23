import { describe, expect, it } from 'vitest';
import { fileWithOverrides } from './test-helpers.js';
import {
  bodySerializationProblem,
  collectSemanticIssues,
  isBroadPattern,
  isCrossOriginPattern,
  isForbiddenFixturePath,
} from './validate.js';

describe('pattern breadth', () => {
  it('rejects contract-listed broad patterns', () => {
    for (const pattern of ['*', '**', '**/*', '**/**', '///', '/']) {
      expect(isBroadPattern(pattern), pattern).toBe(true);
    }
  });

  it('accepts real path globs', () => {
    for (const pattern of ['**/api/account', '/api/**', '/api/v1/users/*']) {
      expect(isBroadPattern(pattern), pattern).toBe(false);
    }
  });

  it('rejects all-wildcard segment patterns', () => {
    expect(isBroadPattern('*/**')).toBe(true);
    expect(isBroadPattern('a/**')).toBe(false);
  });

  it('flags cross-origin patterns', () => {
    expect(isCrossOriginPattern('https://cdn.example.com/**')).toBe(true);
    expect(isCrossOriginPattern('http://localhost:5173/api')).toBe(true);
    expect(isCrossOriginPattern('**/api/account')).toBe(false);
  });
});

describe('fixture path jail', () => {
  it('allows relative paths inside the scenario directory', () => {
    expect(isForbiddenFixturePath('fixtures/account-empty.json')).toBe(false);
    expect(isForbiddenFixturePath('data/nested/x.json')).toBe(false);
  });

  it('rejects absolute paths and traversal', () => {
    expect(isForbiddenFixturePath('/etc/passwd')).toBe(true);
    expect(isForbiddenFixturePath('\\windows\\evil.json')).toBe(true);
    expect(isForbiddenFixturePath('C:\\secrets.json')).toBe(true);
    expect(isForbiddenFixturePath('../outside.json')).toBe(true);
    expect(isForbiddenFixturePath('fixtures/../../etc/passwd')).toBe(true);
    expect(isForbiddenFixturePath('')).toBe(true);
  });
});

describe('body serializability', () => {
  it('accepts plain JSON data', () => {
    expect(bodySerializationProblem({ a: [1, 'two', null], b: { c: true } })).toBeNull();
  });

  it('rejects functions, symbols, undefined, BigInt', () => {
    expect(bodySerializationProblem(() => 1)).toMatch(/function/);
    expect(bodySerializationProblem(Symbol('x'))).toMatch(/symbol/);
    expect(bodySerializationProblem(undefined)).toMatch(/undefined/);
    expect(bodySerializationProblem(BigInt(1))).toMatch(/BigInt/);
    expect(bodySerializationProblem({ nested: undefined })).toMatch(/undefined/);
  });

  it('rejects circular references and oversized bodies', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(bodySerializationProblem(circular)).toMatch(/circular|failed/);

    const big = { blob: 'x'.repeat(1024 * 1024 + 1) };
    expect(bodySerializationProblem(big)).toMatch(/1 MB/);
  });
});

describe('collectSemanticIssues', () => {
  it('reports duplicate scenario ids', () => {
    const file = fileWithOverrides({
      scenarios: [
        {
          id: 'dup',
          request: { method: 'GET', urlPattern: '**/api/a' },
          response: { mode: 'offline' },
          expect: { visible: '.x' },
        },
        {
          id: 'dup',
          request: { method: 'POST', urlPattern: '**/api/b' },
          response: { mode: 'offline' },
          expect: { visible: '.y' },
        },
      ],
    });
    const issues = collectSemanticIssues(file);
    expect(issues.some((issue) => issue.code === 'DUPLICATE_SCENARIO_ID')).toBe(true);
  });

  it('reports duplicate viewport names', () => {
    const file = fileWithOverrides({
      viewports: [
        { name: 'mobile', width: 390, height: 844 },
        { name: 'mobile', width: 360, height: 800 },
      ],
    });
    const issues = collectSemanticIssues(file);
    expect(issues.some((issue) => issue.code === 'DUPLICATE_VIEWPORT_NAME')).toBe(true);
  });

  it('flags too-broad and cross-origin patterns per scenario', () => {
    const file = fileWithOverrides({
      scenarios: [
        {
          id: 'broad',
          request: { method: 'GET', urlPattern: '**/*' },
          response: { mode: 'offline' },
          expect: { visible: '.x' },
        },
      ],
    });
    const issues = collectSemanticIssues(file);
    expect(issues.some((issue) => issue.code === 'PATTERN_TOO_BROAD')).toBe(true);

    const crossOrigin = fileWithOverrides({
      scenarios: [
        {
          id: 'cross',
          request: { method: 'GET', urlPattern: 'https://evil.example/**' },
          response: { mode: 'offline' },
          expect: { visible: '.x' },
        },
      ],
    });
    expect(collectSemanticIssues(crossOrigin)[0]?.code).toBe('PATTERN_CROSS_ORIGIN');
  });

  it('flags forbidden fixture paths and non-serializable bodies', () => {
    const fixtureFile = fileWithOverrides({
      scenarios: [
        {
          id: 'bad-path',
          request: { method: 'GET', urlPattern: '**/api/a' },
          response: { mode: 'fixture', path: '../outside.json' },
          expect: { visible: '.x' },
        },
      ],
    });
    expect(collectSemanticIssues(fixtureFile)[0]?.code).toBe('FIXTURE_PATH_FORBIDDEN');

    const inlineFile = fileWithOverrides({
      scenarios: [
        {
          id: 'bad-body',
          request: { method: 'GET', urlPattern: '**/api/a' },
          response: { mode: 'inline', body: Symbol('nope') as unknown as string },
          expect: { visible: '.x' },
        },
      ],
    });
    expect(collectSemanticIssues(inlineFile)[0]?.code).toBe('BODY_NOT_SERIALIZABLE');
  });

  it('returns no issues for the canonical file', () => {
    expect(collectSemanticIssues(fileWithOverrides({}))).toHaveLength(0);
  });
});
