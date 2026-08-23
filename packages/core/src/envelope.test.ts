import { describe, expect, it } from 'vitest';
import { buildEnvelope } from './envelope.js';

describe('buildEnvelope', () => {
  it('marks ok true only for exit code 0', () => {
    const ok = buildEnvelope({ type: 'list.result', data: { items: [] }, exitCode: 0 });
    expect(ok.ok).toBe(true);
    expect(ok.error).toBeNull();

    const failed = buildEnvelope({
      type: 'run.result',
      data: { scenarios: [] },
      exitCode: 1,
    });
    expect(failed.ok).toBe(false);
    expect(failed.data).not.toBeNull();
    expect(failed.error).toBeNull();
  });

  it('carries structured errors with hints and optional file/runId', () => {
    const envelope = buildEnvelope({
      type: 'error',
      data: null,
      exitCode: 2,
      error: {
        code: 'SCENARIO_FILE_MISSING',
        message: 'Scenario file not found.',
        hint: 'Run stateproof init or pass --file.',
        file: 'stateproof.scenarios.json',
        runId: null,
      },
    });
    expect(envelope.ok).toBe(false);
    expect(envelope.data).toBeNull();
    expect(envelope.error?.runId).toBeNull();
    expect(envelope.error?.file).toBe('stateproof.scenarios.json');
  });

  it('stamps schemaVersion 1 on every envelope', () => {
    const envelope = buildEnvelope({ type: 'init.result', exitCode: 0 });
    expect(envelope.schemaVersion).toBe(1);
  });
});
