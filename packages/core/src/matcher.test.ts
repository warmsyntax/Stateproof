import { describe, expect, it } from 'vitest';
import { matchesRequest } from './matcher.js';
import type { RequestRule } from './types.js';

const rule: RequestRule = { method: 'GET', urlPattern: '**/api/account' };

describe('matchesRequest', () => {
  const cases: Array<{ name: string; method: string; url: string; expected: boolean }> = [
    {
      name: 'same-origin match',
      method: 'GET',
      url: 'http://localhost:5173/api/account',
      expected: true,
    },
    {
      name: 'nested prefix match',
      method: 'GET',
      url: 'http://localhost:5173/v2/api/account',
      expected: true,
    },
    {
      name: 'query strings ignored',
      method: 'GET',
      url: 'http://localhost:5173/api/account?fresh=1',
      expected: true,
    },
    {
      name: 'method mismatch passes through',
      method: 'POST',
      url: 'http://localhost:5173/api/account',
      expected: false,
    },
    {
      name: 'different path rejected',
      method: 'GET',
      url: 'http://localhost:5173/api/other',
      expected: false,
    },
    {
      name: 'prefix-only path rejected',
      method: 'GET',
      url: 'http://localhost:5173/api/accountExtra',
      expected: false,
    },
  ];

  for (const testCase of cases) {
    it(testCase.name, () => {
      expect(matchesRequest(rule, testCase.method, testCase.url)).toBe(testCase.expected);
    });
  }

  it('is case-sensitive on method but tolerant of URL casing in method input', () => {
    expect(matchesRequest(rule, 'get', 'http://x/api/account')).toBe(true);
  });

  it('returns false for unparseable URLs', () => {
    expect(matchesRequest(rule, 'GET', 'not a url')).toBe(false);
  });

  it('supports exact-path patterns', () => {
    const exact: RequestRule = { method: 'HEAD', urlPattern: '/health' };
    expect(matchesRequest(exact, 'HEAD', 'http://x/health')).toBe(true);
    expect(matchesRequest(exact, 'HEAD', 'http://x/health/deep')).toBe(false);
  });

  it('matches dotted segments when dot option is on', () => {
    const dotted: RequestRule = { method: 'GET', urlPattern: '/.well-known/*' };
    expect(matchesRequest(dotted, 'GET', 'http://x/.well-known/assetlink')).toBe(true);
  });
});
