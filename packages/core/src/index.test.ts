import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from './index.js';

describe('core skeleton', () => {
  it('freezes schema version at 1', () => {
    expect(SCHEMA_VERSION).toBe(1);
  });
});
