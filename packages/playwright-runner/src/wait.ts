import type { Page } from 'playwright';

export class SelectorTimeoutError extends Error {
  constructor(readonly selector: string) {
    super(`selector not visible in time: ${selector}`);
    this.name = 'SelectorTimeoutError';
  }
}

export class SelectorUnstableError extends Error {
  constructor(readonly selectors: string[]) {
    super('selectors did not remain visible continuously for stableMs');
    this.name = 'SelectorUnstableError';
  }
}

async function allVisible(page: Page, selectors: string[]): Promise<boolean> {
  const states = await Promise.all(
    selectors.map((selector) => page.locator(selector).first().isVisible()),
  );
  return states.every(Boolean);
}

export async function waitForSelectors(
  page: Page,
  selectors: string[],
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (const selector of selectors) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new SelectorTimeoutError(selector);
    try {
      await page.locator(selector).first().waitFor({ state: 'visible', timeout: Math.max(remaining, 1) });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'TimeoutError' || /timeout|exceeded/i.test(error.message))
      ) {
        throw new SelectorTimeoutError(selector);
      }
      throw error;
    }
  }
}

// Contract §6.5: after visibility, every selector must stay visible
// continuously for stableMs; any hide restarts the accumulation.
export async function waitStable(
  page: Page,
  selectors: string[],
  stableMs: number,
  timeoutMs: number,
): Promise<void> {
  if (stableMs <= 0) return;
  const pollInterval = 50;
  let accumulated = 0;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await allVisible(page, selectors)) {
      accumulated += pollInterval;
      if (accumulated >= stableMs) return;
    } else {
      accumulated = 0;
    }
    const remaining = deadline - Date.now();
    await sleep(Math.min(pollInterval, Math.max(remaining, 1)));
  }
  throw new SelectorUnstableError(selectors);
}

export async function scrollFirstIntoView(page: Page, selector: string): Promise<void> {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
