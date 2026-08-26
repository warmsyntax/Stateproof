import type { Page } from 'playwright';
import { describe, expect, it } from 'vitest';
import { analyzeDomForSelectors } from './analyzer.js';

describe('analyzeDomForSelectors', () => {
  it('returns candidate selectors when page elements are found', async () => {
    // Mock Playwright Page object
    const mockPage = {
      locator: (sel: string) => ({
        count: async () => {
          if (sel === '[data-state="loading"]' || sel === '[role="alert"]') {
            return 1;
          }
          return 0;
        },
      }),
    } as unknown as Page;

    const report = await analyzeDomForSelectors(mockPage);
    expect(report.selectors).toContain('[data-state="loading"]');
    expect(report.selectors).toContain('[role="alert"]');
    expect(report.hints.some((h) => h.includes('[data-state="loading"]'))).toBe(true);
    expect(report.hints.some((h) => h.includes('[role="alert"]'))).toBe(true);
  });

  it('handles page locator errors gracefully and returns empty list if none match', async () => {
    const mockPage = {
      locator: () => ({
        count: async () => {
          throw new Error('Element not found or page closed');
        },
      }),
    } as unknown as Page;

    const report = await analyzeDomForSelectors(mockPage);
    expect(report.selectors).toEqual([]);
    expect(report.hints).toEqual([]);
  });
});
