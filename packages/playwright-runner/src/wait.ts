import type { Page } from 'playwright';

export class ElementNotHiddenError extends Error {
  constructor(readonly selector: string) {
    super(`element is still visible, expected hidden: ${selector}`);
    this.name = 'ElementNotHiddenError';
  }
}

export class TextMismatchError extends Error {
  constructor(
    readonly selector: string,
    readonly expected: string,
    readonly actual: string,
  ) {
    super(
      `text mismatch for selector "${selector}": expected to contain "${expected}", found "${actual}"`,
    );
    this.name = 'TextMismatchError';
  }
}

export class AttributeMismatchError extends Error {
  constructor(
    readonly selector: string,
    readonly attribute: string,
    readonly expected: string,
    readonly actual: string,
  ) {
    super(
      `attribute mismatch on "${selector}": expected attribute "${attribute}"="${expected}", found "${actual}"`,
    );
    this.name = 'AttributeMismatchError';
  }
}

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
      await page
        .locator(selector)
        .first()
        .waitFor({ state: 'visible', timeout: Math.max(remaining, 1) });
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

export async function waitForHidden(
  page: Page,
  selectors: string[],
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (const selector of selectors) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new ElementNotHiddenError(selector);
    try {
      await page
        .locator(selector)
        .first()
        .waitFor({ state: 'hidden', timeout: Math.max(remaining, 1) });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'TimeoutError' || /timeout|exceeded/i.test(error.message))
      ) {
        throw new ElementNotHiddenError(selector);
      }
      throw error;
    }
  }
}

export async function verifyText(
  page: Page,
  textExpectations: Record<string, string>,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (const [selector, expectedText] of Object.entries(textExpectations)) {
    const loc = page.locator(selector).first();
    let lastFound = '';
    let found = false;
    let pollDelay = 50;
    while (Date.now() < deadline) {
      try {
        const text = (await loc.textContent()) ?? '';
        lastFound = text.trim();
        if (lastFound.includes(expectedText.trim())) {
          found = true;
          break;
        }
      } catch {
        // retry until deadline
      }
      await sleep(pollDelay);
      pollDelay = Math.min(pollDelay * 2, 500);
    }
    if (!found) {
      throw new TextMismatchError(selector, expectedText, lastFound);
    }
  }
}

export async function verifyAttributes(
  page: Page,
  attrExpectations: Record<string, Record<string, string | boolean>>,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (const [selector, attrs] of Object.entries(attrExpectations)) {
    const loc = page.locator(selector).first();
    for (const [attrName, expectedVal] of Object.entries(attrs)) {
      let matched = false;
      let lastVal: string | null = null;
      let pollDelay = 50;
      while (Date.now() < deadline) {
        try {
          if (typeof expectedVal === 'boolean') {
            if (attrName === 'disabled') {
              const isDisabled = await loc.isDisabled();
              lastVal = String(isDisabled);
              if (isDisabled === expectedVal) {
                matched = true;
                break;
              }
            } else {
              const val = await loc.getAttribute(attrName);
              lastVal = val;
              const isPresent = val !== null && val.toLowerCase() !== 'false';
              if (isPresent === expectedVal) {
                matched = true;
                break;
              }
            }
          } else {
            const val = await loc.getAttribute(attrName);
            lastVal = val;
            if (val === String(expectedVal)) {
              matched = true;
              break;
            }
          }
        } catch {
          // retry until deadline
        }
        await sleep(pollDelay);
        pollDelay = Math.min(pollDelay * 2, 500);
      }
      if (!matched) {
        throw new AttributeMismatchError(
          selector,
          attrName,
          String(expectedVal),
          String(lastVal ?? 'null'),
        );
      }
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
  if (stableMs <= 0 || selectors.length === 0) return;
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

export async function scrollFirstIntoView(
  page: Page,
  selector: string,
  timeoutMs = 2000,
): Promise<void> {
  try {
    await page.locator(selector).first().scrollIntoViewIfNeeded({ timeout: timeoutMs });
  } catch {
    // Element may be hidden or already in view; proceed without stalling.
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
