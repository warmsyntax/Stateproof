import { describe, expect, it } from 'vitest';
import { scanTextForSecrets, scanValueForSecrets } from './secrets.js';

describe('scanTextForSecrets', () => {
  it('flags known key prefixes without printing the full secret', () => {
    const findings = scanTextForSecrets('token: sk-abc123def456ghi789');
    expect(findings.some((finding) => finding.detail.includes('sk-'))).toBe(true);

    const github = scanTextForSecrets('ghp_0123456789abcdefghijklmnopqrstuvwxyz');
    expect(github.some((finding) => finding.detail.includes('ghp_'))).toBe(true);
  });

  it('flags AWS access key ids', () => {
    const findings = scanTextForSecrets('AKIAIOSFODNN7EXAMPLE is an aws id');
    expect(findings.some((finding) => finding.detail.includes('AWS'))).toBe(true);
  });

  it('flags high-entropy strings longer than 40 chars', () => {
    const entropy =
      'c1V9xJ7qZm2Ke8Yw3nT5rB6uH4aS0dF2gX7zQ9pL8oR6tI4yU2W0eA3fD5gJ7hK9lM+nO/PqRsTuVwXyZ';
    const findings = scanTextForSecrets(`secret ${entropy} end`);
    expect(
      findings.some((finding) => finding.kind === 'high-entropy' && finding.detail.includes('…')),
    ).toBe(true);
  });

  it('ignores normal prose and short tokens', () => {
    expect(scanTextForSecrets('The quick brown fox jumps over the lazy dog.')).toHaveLength(0);
    expect(scanTextForSecrets('sk-')).toHaveLength(0);
  });
});

describe('scanValueForSecrets', () => {
  it('scans serialized objects', () => {
    const findings = scanValueForSecrets({ apiKey: 'sk-live-abcdef1234567890' });
    expect(findings.length).toBeGreaterThan(0);
  });

  it('returns no findings for clean data and survives circular input', () => {
    expect(scanValueForSecrets({ safe: 'hello world' })).toHaveLength(0);
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(scanValueForSecrets(circular)).toHaveLength(0);
  });
});
