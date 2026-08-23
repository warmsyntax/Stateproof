export interface SecretFinding {
  kind: 'key-prefix' | 'high-entropy';
  detail: string;
}

const KEY_PREFIX_PATTERNS: Array<{ pattern: RegExp; kind: SecretFinding['kind']; label: string }> =
  [
    { pattern: /\bsk-[A-Za-z0-9][A-Za-z0-9_-]{7,}/, kind: 'key-prefix', label: 'sk- service key' },
    { pattern: /\bghp_[A-Za-z0-9]{8,}/, kind: 'key-prefix', label: 'ghp_ token' },
  ];

const HIGH_ENTROPY_TOKEN = /^[A-Za-z0-9+/_=-]{41,}$/;

function shannonEntropy(token: string): number {
  const counts = new Map<string, number>();
  for (const char of token) {
    counts.set(char, (counts.get(char) ?? 0) + 1);
  }
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / token.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function redactSample(token: string): string {
  return `${token.slice(0, 6)}…(${token.length} chars)`;
}

export function scanTextForSecrets(text: string): SecretFinding[] {
  const findings: SecretFinding[] = [];

  for (const { pattern, label } of KEY_PREFIX_PATTERNS) {
    if (pattern.test(text)) {
      findings.push({ kind: 'key-prefix', detail: `looks like ${label}` });
    }
  }

  if (/AKIA[0-9A-Z]{8,}/.test(text)) {
    findings.push({ kind: 'key-prefix', detail: 'looks like an AWS access key id (AKIA…)' });
  }

  for (const rawToken of text.split(/\s+/)) {
    const token = rawToken.replace(/["',;:()[\]{}]+$/u, '').replace(/^["']+/u, '');
    if (!HIGH_ENTROPY_TOKEN.test(token)) continue;
    if (shannonEntropy(token) >= 4.5) {
      findings.push({
        kind: 'high-entropy',
        detail: `high-entropy string (${redactSample(token)})`,
      });
      break;
    }
  }

  return findings;
}

export function scanValueForSecrets(value: unknown): SecretFinding[] {
  let serialized: string;
  try {
    serialized = typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    return [];
  }
  return serialized === undefined ? [] : scanTextForSecrets(serialized);
}
