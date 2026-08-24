import { describe, expect, it } from 'vitest';
import { classifyRequest, contentTypeForFixturePath } from './classify.js';

const ORIGIN = 'http://localhost:5173';

describe('classifyRequest', () => {
  it('passes data and blob schemes through untouched', () => {
    expect(classifyRequest('data:image/png;base64,abc', ORIGIN, false)?.disposition).toBe(
      'data-blob-passthrough',
    );
    expect(classifyRequest('blob:http://localhost:5173/uuid', ORIGIN, false)?.disposition).toBe(
      'data-blob-passthrough',
    );
  });

  it('blocks third-party origins by default', () => {
    const result = classifyRequest('https://cdn.example.com/lib.js', ORIGIN, false);
    expect(result?.disposition).toBe('third-party-block');
  });

  it('allows third-party origins only when permitted', () => {
    const result = classifyRequest('https://cdn.example.com/lib.js', ORIGIN, true);
    expect(result?.disposition).toBe('third-party-fetch');
  });

  it('treats a different port as third-party', () => {
    const result = classifyRequest('http://localhost:9999/beacon.png', ORIGIN, false);
    expect(result?.disposition).toBe('third-party-block');
  });

  it('marks same-origin requests for rule matching or passthrough decision upstream', () => {
    expect(classifyRequest('http://localhost:5173/api/account', ORIGIN, false)?.disposition).toBe(
      'same-origin-passthrough',
    );
  });

  it('returns null for unparseable URLs so callers can abort safely', () => {
    expect(classifyRequest('not a url at all', ORIGIN, false)).toBeNull();
  });
});

describe('contentTypeForFixturePath', () => {
  it('maps known extensions per contract §6.4', () => {
    expect(contentTypeForFixturePath('fixtures/a.json')).toBe('application/json');
    expect(contentTypeForFixturePath('notes.txt')).toBe('text/plain');
    expect(contentTypeForFixturePath('page.html')).toBe('text/html');
  });

  it('falls back to octet-stream for unknown extensions', () => {
    expect(contentTypeForFixturePath('blob.bin')).toBe('application/octet-stream');
    expect(contentTypeForFixturePath('noext')).toBe('application/octet-stream');
  });
});
