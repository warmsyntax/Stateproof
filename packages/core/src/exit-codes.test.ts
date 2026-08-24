import { describe, expect, it } from 'vitest';
import {
  computeExitCode,
  EXIT_ENVIRONMENT,
  EXIT_INTERNAL,
  EXIT_PASS,
  EXIT_SCENARIO_FAILURE,
  exitCodeFor,
} from './exit-codes.js';

const passed = { status: 'passed' } as const;
const failed = { status: 'failed' } as const;
const errored = { status: 'error' } as const;

describe('computeExitCode', () => {
  it('maps all-passed runs to 0', () => {
    expect(computeExitCode({ outcomes: [passed, passed] })).toBe(EXIT_PASS);
    expect(computeExitCode({ outcomes: [] })).toBe(EXIT_PASS);
  });

  it('maps scenario failures to 1', () => {
    expect(computeExitCode({ outcomes: [passed, failed] })).toBe(EXIT_SCENARIO_FAILURE);
  });

  it('maps per-scenario runner crashes to 4', () => {
    expect(computeExitCode({ outcomes: [passed, errored] })).toBe(EXIT_INTERNAL);
  });

  it('maps fatal environment and internal errors to 3 and 4 even with partial results', () => {
    expect(computeExitCode({ outcomes: [failed], fatal: 'environment' })).toBe(EXIT_ENVIRONMENT);
    expect(computeExitCode({ outcomes: [passed], fatal: 'internal' })).toBe(EXIT_INTERNAL);
  });

  it('respects precedence: internal > environment > scenario error > failure > pass', () => {
    const mixed = { outcomes: [failed, errored, passed], fatal: 'environment' as const };
    expect(computeExitCode(mixed)).toBe(EXIT_ENVIRONMENT);
    expect(computeExitCode({ ...mixed, fatal: 'internal' })).toBe(EXIT_INTERNAL);
    expect(computeExitCode({ outcomes: [failed, errored] })).toBe(EXIT_INTERNAL);
  });
});

describe('exitCodeFor (CLI error registry)', () => {
  it('assigns usage errors to 2', () => {
    for (const code of [
      'SCENARIO_FILE_MISSING',
      'SCHEMA_INVALID',
      'ARTIFACT_LOCKED',
      'INTERACTIVE_TTY_REQUIRED',
      'BASELINE_MISSING',
      'BASELINE_WRITE_FAILED',
      'VISUAL_DIFF_FAILED',
      'MCP_SERVER_INVALID_PROJECT_ROOT',
      'SELECTOR_SUGGESTION_UNAVAILABLE',
    ] as const) {
      expect(exitCodeFor(code)).toBe(2);
    }
  });

  it('assigns environment errors to 3', () => {
    expect(exitCodeFor('APP_UNREACHABLE')).toBe(3);
    expect(exitCodeFor('BROWSER_MISSING')).toBe(3);
  });

  it('assigns internal errors to 4', () => {
    expect(exitCodeFor('INTERNAL_ERROR')).toBe(4);
  });
});
