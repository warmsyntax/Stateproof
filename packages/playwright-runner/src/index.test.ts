import { describe, expect, it } from 'vitest';
import { engineName } from './index.js';

describe('playwright-runner skeleton', () => {
  it('exposes its package name', () => {
    expect(engineName).toBe('@stateproof/playwright-runner');
  });
});
