import { describe, expect, it } from 'vitest';
import type { StateproofError } from './errors.js';
import { assertFixtureContent, isJsonFixturePath } from './fixtures.js';

const encoder = new TextEncoder();

describe('assertFixtureContent', () => {
  it('accepts valid json fixtures within the size limit', () => {
    const bytes = encoder.encode('{"users": []}');
    expect(() => assertFixtureContent('fixtures/empty.json', bytes)).not.toThrow();
  });

  it('rejects fixtures larger than 1 MB', () => {
    const big = encoder.encode('x'.repeat(1024 * 1024 + 1));
    try {
      assertFixtureContent('fixtures/big.json', big);
      throw new Error('expected failure');
    } catch (error) {
      expect((error as StateproofError).code).toBe('FIXTURE_TOO_LARGE');
    }
  });

  it('rejects invalid JSON in .json fixtures', () => {
    const broken = encoder.encode('{ not json');
    try {
      assertFixtureContent('fixtures/broken.json', broken);
      throw new Error('expected failure');
    } catch (error) {
      expect((error as StateproofError).code).toBe('FIXTURE_INVALID_JSON');
      expect((error as StateproofError).file).toBe('fixtures/broken.json');
    }
  });

  it('does not parse non-json extensions', () => {
    const bytes = encoder.encode('<html>plain</html>');
    expect(() => assertFixtureContent('fixtures/page.html', bytes)).not.toThrow();
  });
});

describe('isJsonFixturePath', () => {
  it('is extension-driven and case-insensitive', () => {
    expect(isJsonFixturePath('a.JSON')).toBe(true);
    expect(isJsonFixturePath('a.txt')).toBe(false);
  });
});
