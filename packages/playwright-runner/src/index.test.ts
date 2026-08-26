import { SCHEMA_VERSION } from '@stateproof-dev/core';
import { describe, expect, it } from 'vitest';
import { runnerVersion } from './version.js';

describe('playwright-runner skeleton', () => {
  it('exposes its version and consumes the core schema version', () => {
    expect(runnerVersion).toBe('0.1.3');
    expect(SCHEMA_VERSION).toBe(1);
  });
});
