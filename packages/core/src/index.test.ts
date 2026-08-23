import { describe, expect, it } from 'vitest';
import { engineName, schemaVersion } from './index.js';

describe('core skeleton', () => {
  it('exposes stable engine metadata', () => {
    expect(engineName).toBe('@stateproof/core');
    expect(schemaVersion).toBe(1);
  });
});
