import { describe, expect, it } from 'vitest';
import * as reporterHtml from './index.js';

describe('@stateproof/reporter-html package exports', () => {
  it('exports public API functions and constants', () => {
    expect(typeof reporterHtml.escapeHtml).toBe('function');
    expect(typeof reporterHtml.renderHtmlReport).toBe('function');
    expect(typeof reporterHtml.writeHtmlReport).toBe('function');
    expect(typeof reporterHtml.INLINE_REPORT_STYLES).toBe('string');
  });
});
