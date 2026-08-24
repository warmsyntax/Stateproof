import { SCHEMA_VERSION } from '@stateproof/core';
import { describe, expect, it } from 'vitest';
import { runnerVersion } from './version.js';

describe('playwright-runner skeleton', () => {
  it('exposes its version and consumes the core schema version', () => {
    expect(runnerVersion).toBe('0.1.0');
    expect(SCHEMA_VERSION).toBe(1);
  });
});
