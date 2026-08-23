import { describe, expect, it } from 'vitest';
import { cliName } from './index.js';

describe('cli skeleton', () => {
  it('exposes its package name', () => {
    expect(cliName).toBe('@stateproof/cli');
  });
});
