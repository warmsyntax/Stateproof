import type { Locator, Page } from 'playwright';
import { describe, expect, it } from 'vitest';
import {
  AttributeMismatchError,
  ElementNotHiddenError,
  SelectorTimeoutError,
  TextMismatchError,
  verifyAttributes,
  verifyText,
  waitForHidden,
  waitForSelectors,
} from './wait.js';

function createMockPage(
  elementMap: Record<
    string,
    {
      attrs?: Record<string, string | null>;
      disabled?: boolean;
      text?: string;
      visible?: boolean;
    }
  >,
): Page {
  return {
    locator: (selector: string) => {
      const el = elementMap[selector];
      return {
        first: () =>
          ({
            isDisabled: async () => el?.disabled ?? false,
            getAttribute: async (name: string) => (el?.attrs ? (el.attrs[name] ?? null) : null),
            textContent: async () => el?.text ?? null,
            isVisible: async () => el?.visible ?? true,
            waitFor: async ({ state }: { state: 'visible' | 'hidden' }) => {
              if (state === 'visible' && el?.visible === false) {
                throw new Error('TimeoutError: waiting for selector');
              }
              if (state === 'hidden' && el?.visible !== false) {
                throw new Error('TimeoutError: waiting for selector hidden');
              }
            },
          }) as unknown as Locator,
      } as unknown as Locator;
    },
  } as unknown as Page;
}

describe('verifyAttributes', () => {
  it('correctly validates boolean attribute presence for true', async () => {
    // <button aria-busy data-loading=""> (getAttribute returns "")
    const page = createMockPage({
      '#btn': {
        attrs: {
          'aria-busy': '',
          'data-loading': 'true',
        },
      },
    });

    await expect(
      verifyAttributes(page, { '#btn': { 'aria-busy': true, 'data-loading': true } }, 100),
    ).resolves.toBeUndefined();
  });

  it('correctly validates boolean attribute absence for false', async () => {
    // <button> (no aria-busy attribute, getAttribute returns null)
    const page = createMockPage({
      '#btn': {
        attrs: {},
      },
    });

    await expect(
      verifyAttributes(page, { '#btn': { 'aria-busy': false, 'data-loading': false } }, 100),
    ).resolves.toBeUndefined();
  });

  it('treats aria-* attribute with value "false" as false', async () => {
    // <button aria-busy="false">
    const page = createMockPage({
      '#btn': {
        attrs: { 'aria-busy': 'false' },
      },
    });

    // Should pass when expecting false
    await expect(
      verifyAttributes(page, { '#btn': { 'aria-busy': false } }, 100),
    ).resolves.toBeUndefined();

    // Should fail when expecting true
    await expect(verifyAttributes(page, { '#btn': { 'aria-busy': true } }, 100)).rejects.toThrow(
      AttributeMismatchError,
    );
  });

  it('fails with AttributeMismatchError when attribute is missing but expected true', async () => {
    const page = createMockPage({
      '#btn': { attrs: {} },
    });

    await expect(verifyAttributes(page, { '#btn': { 'aria-busy': true } }, 100)).rejects.toThrow(
      AttributeMismatchError,
    );
  });

  it('validates disabled boolean attribute via isDisabled()', async () => {
    const pageDisabled = createMockPage({
      '#btn': { disabled: true },
    });
    const pageEnabled = createMockPage({
      '#btn': { disabled: false },
    });

    await expect(
      verifyAttributes(pageDisabled, { '#btn': { disabled: true } }, 100),
    ).resolves.toBeUndefined();

    await expect(
      verifyAttributes(pageEnabled, { '#btn': { disabled: false } }, 100),
    ).resolves.toBeUndefined();

    await expect(
      verifyAttributes(pageEnabled, { '#btn': { disabled: true } }, 100),
    ).rejects.toThrow(AttributeMismatchError);
  });

  it('validates exact string attribute values', async () => {
    const page = createMockPage({
      '#btn': {
        attrs: { 'data-state': 'loading', type: 'submit' },
      },
    });

    await expect(
      verifyAttributes(page, { '#btn': { 'data-state': 'loading', type: 'submit' } }, 100),
    ).resolves.toBeUndefined();

    await expect(
      verifyAttributes(page, { '#btn': { 'data-state': 'ready' } }, 100),
    ).rejects.toThrow(AttributeMismatchError);
  });
});

describe('verifyText', () => {
  it('passes when text includes the expected substring', async () => {
    const page = createMockPage({
      h1: { text: 'Welcome to Dashboard' },
    });

    await expect(verifyText(page, { h1: 'Welcome' }, 100)).resolves.toBeUndefined();
  });

  it('throws TextMismatchError when text does not match', async () => {
    const page = createMockPage({
      h1: { text: 'Login' },
    });

    await expect(verifyText(page, { h1: 'Welcome' }, 100)).rejects.toThrow(TextMismatchError);
  });
});

describe('waitForSelectors and waitForHidden', () => {
  it('passes when selector is visible', async () => {
    const page = createMockPage({
      '#loading': { visible: true },
    });

    await expect(waitForSelectors(page, ['#loading'], 100)).resolves.toBeUndefined();
  });

  it('throws SelectorTimeoutError when selector is not visible', async () => {
    const page = createMockPage({
      '#loading': { visible: false },
    });

    await expect(waitForSelectors(page, ['#loading'], 100)).rejects.toThrow(SelectorTimeoutError);
  });

  it('passes when selector is hidden', async () => {
    const page = createMockPage({
      '#spinner': { visible: false },
    });

    await expect(waitForHidden(page, ['#spinner'], 100)).resolves.toBeUndefined();
  });

  it('throws ElementNotHiddenError when selector is still visible', async () => {
    const page = createMockPage({
      '#spinner': { visible: true },
    });

    await expect(waitForHidden(page, ['#spinner'], 100)).rejects.toThrow(ElementNotHiddenError);
  });
});
