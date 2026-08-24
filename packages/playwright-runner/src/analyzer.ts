import type { Page } from 'playwright';

export interface SelectorSuggestionReport {
  selectors: string[];
  hints: string[];
}

const CANDIDATE_SELECTORS = {
  loading: [
    '[data-testid="loading"]',
    '[data-state="loading"]',
    '[role="progressbar"]',
    '[aria-busy="true"]',
    '[class*="skeleton"]',
    '[class*="spinner"]',
    '[class*="loading"]',
  ],
  error: [
    '[data-testid="error"]',
    '[data-testid="retry"]',
    '[data-state="error"]',
    '[role="alert"]',
    '[class*="error"]',
    'button:has-text("Retry")',
    'button:has-text("Try again")',
  ],
  empty: [
    '[data-testid="empty"]',
    '[data-state="empty"]',
    '[role="status"]',
    '[class*="empty"]',
  ],
};

export async function analyzeDomForSelectors(page: Page): Promise<SelectorSuggestionReport> {
  const suggestions: string[] = [];
  const hints: string[] = [];

  try {
    // Check loading heuristics
    for (const sel of CANDIDATE_SELECTORS.loading) {
      try {
        const count = await page.locator(sel).count();
        if (count > 0) {
          suggestions.push(sel);
          hints.push(`detected loading state candidate: ${sel}`);
        }
      } catch {
        // Skip invalid or unmatchable selector
      }
    }

    // Check error heuristics
    for (const sel of CANDIDATE_SELECTORS.error) {
      try {
        const count = await page.locator(sel).count();
        if (count > 0) {
          suggestions.push(sel);
          hints.push(`detected error state candidate: ${sel}`);
        }
      } catch {
        // Skip
      }
    }

    // Check empty heuristics
    for (const sel of CANDIDATE_SELECTORS.empty) {
      try {
        const count = await page.locator(sel).count();
        if (count > 0) {
          suggestions.push(sel);
          hints.push(`detected empty state candidate: ${sel}`);
        }
      } catch {
        // Skip
      }
    }
  } catch {
    // If page is closed or evaluate fails, return empty
  }

  // Deduplicate suggestions
  const uniqueSelectors = Array.from(new Set(suggestions));
  const uniqueHints = Array.from(new Set(hints));

  return {
    selectors: uniqueSelectors,
    hints: uniqueHints,
  };
}
