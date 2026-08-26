import { describe, expect, it } from 'vitest';
import type { StateproofError } from './errors.js';
import { scenarioFileSchema, validateScenarioShape } from './schema.js';
import { fileWithOverrides, validScenarioFile } from './test-helpers.js';
import type { ScenarioFile } from './types.js';

function shapeError(value: unknown): StateproofError {
  try {
    validateScenarioShape(value);
  } catch (error) {
    return error as StateproofError;
  }
  throw new Error('expected validation failure');
}

function firstScenarioOf(file: ScenarioFile): ScenarioFile['scenarios'][number] {
  const first = file.scenarios[0];
  if (!first) throw new Error('test file must contain a scenario');
  return first;
}

describe('validateScenarioShape', () => {
  it('accepts the canonical minimal file', () => {
    expect(validateScenarioShape(validScenarioFile).name).toBe('account-settings');
  });

  it('accepts optional viewports and annotations', () => {
    const file = fileWithOverrides({
      $comment: 'annotated',
      $schema: 'https://stateproof.dev/schema/v1.json',
      viewports: [{ name: 'tablet', width: 768, height: 1024 }],
    });
    expect(validateScenarioShape(file).viewports?.[0]?.name).toBe('tablet');
  });

  it('rejects non-kebab-case names and ids', () => {
    const bad = shapeError(fileWithOverrides({ name: 'AccountSettings' }));
    expect(bad.code).toBe('SCHEMA_INVALID');
    expect(bad.message).toContain('kebab-case');
  });

  it('rejects non-http baseUrl and bad routes', () => {
    expect(shapeError(fileWithOverrides({ baseUrl: 'ftp://localhost' })).message).toContain(
      'baseUrl',
    );
    expect(shapeError(fileWithOverrides({ route: 'no-slash' })).message).toContain('route');
  });

  it('rejects empty scenarios and empty viewports arrays', () => {
    const noScenarios = shapeError(fileWithOverrides({ scenarios: [] }));
    expect(noScenarios.code).toBe('SCHEMA_INVALID');
    const emptyViewports = shapeError(fileWithOverrides({ viewports: [] }));
    expect(emptyViewports.code).toBe('SCHEMA_INVALID');
  });

  it('enforces viewport integer ranges', () => {
    const tooSmall = shapeError(
      fileWithOverrides({ viewports: [{ name: 'tiny', width: 100, height: 400 }] }),
    );
    expect(tooSmall.message).toMatch(/width/);
  });

  it('rejects unknown top-level properties', () => {
    const stray = { ...validScenarioFile, extra: true };
    expect(shapeError(stray).message).toContain('extra');
  });

  it('bounds delay milliseconds to the contract range', () => {
    const file = JSON.parse(JSON.stringify(validScenarioFile)) as ScenarioFile;
    const scenario = firstScenarioOf(file);
    scenario.response = { mode: 'delay', milliseconds: 0 };
    expect(shapeError(file).message).toContain('milliseconds');

    scenario.response = { mode: 'delay', milliseconds: 60001 };
    expect(shapeError(file).message).toContain('milliseconds');
  });

  it('requires error-mode status within 400-599', () => {
    const file = JSON.parse(JSON.stringify(validScenarioFile)) as ScenarioFile;
    const scenario = firstScenarioOf(file);
    scenario.response = { mode: 'error', status: 302 };
    expect(shapeError(file).message).toContain('status');
    scenario.response = { mode: 'error', status: 500 };
    expect(validateScenarioShape(file)).toBeTruthy();
  });

  it('rejects offline mode with additional properties', () => {
    const response = { mode: 'offline', milliseconds: 5 };
    const file = JSON.parse(JSON.stringify(validScenarioFile)) as ScenarioFile;
    firstScenarioOf(file).response = response as ScenarioFile['scenarios'][number]['response'];
    expect(shapeError(file).message).toContain('milliseconds');
  });

  it('supports string or array visible selectors plus stableMs', () => {
    const file = JSON.parse(JSON.stringify(validScenarioFile)) as ScenarioFile;
    firstScenarioOf(file).expect = {
      visible: ["[data-state='loading']", '[data-testid=spinner]'],
      timeoutMs: 5000,
      stableMs: 250,
    };
    const parsed = validateScenarioShape(file);
    expect(parsed.scenarios[0]?.expect.visible).toHaveLength(2);
  });

  it('rejects empty selector strings', () => {
    const file = JSON.parse(JSON.stringify(validScenarioFile)) as ScenarioFile;
    firstScenarioOf(file).expect = { visible: '' };
    expect(shapeError(file).code).toBe('SCHEMA_INVALID');
  });

  it('formats zod issues with dotted paths', () => {
    const raw = { name: 'BAD NAME', scenarios: [] };
    const result = scenarioFileSchema.safeParse(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.path.map(String).join('.')).join(',');
      expect(message).toContain('name');
      expect(message).toContain('scenarios');
    }
  });

  it('supports rich expectations with hidden, text, and attributes', () => {
    const file = JSON.parse(JSON.stringify(validScenarioFile)) as ScenarioFile;
    firstScenarioOf(file).expect = {
      visible: "[data-state='loading']",
      hidden: "[data-state='error']",
      text: { '.title': 'Loading items...' },
      attributes: { '#submit': { disabled: true, 'aria-busy': 'true' } },
    };
    const parsed = validateScenarioShape(file);
    expect(parsed.scenarios[0]?.expect.hidden).toBe("[data-state='error']");
    expect(parsed.scenarios[0]?.expect.text?.['.title']).toBe('Loading items...');
    expect(parsed.scenarios[0]?.expect.attributes?.['#submit']?.disabled).toBe(true);
  });

  it('supports recovery loops with click actions', () => {
    const file = JSON.parse(JSON.stringify(validScenarioFile)) as ScenarioFile;
    firstScenarioOf(file).recovery = {
      action: { type: 'click', selector: '[data-testid="retry"]' },
      response: { mode: 'fixture', path: 'fixtures/products.json' },
      expect: { visible: "[data-state='ready']", hidden: "[data-state='error']" },
    };
    const parsed = validateScenarioShape(file);
    expect(parsed.scenarios[0]?.recovery?.action.type).toBe('click');
    expect(parsed.scenarios[0]?.recovery?.action.selector).toBe('[data-testid="retry"]');
  });

  it('supports websocket connection-drop simulation', () => {
    const file = JSON.parse(JSON.stringify(validScenarioFile)) as ScenarioFile;
    const s = firstScenarioOf(file);
    delete s.request;
    delete s.response;
    s.websocket = {
      urlPattern: '**/ws/feed',
      mode: 'drop-connection',
      afterMs: 500,
    };
    s.expect = { visible: "[data-state='reconnecting']" };
    const parsed = validateScenarioShape(file);
    expect(parsed.scenarios[0]?.websocket?.mode).toBe('drop-connection');
  });

  it('supports per-scenario route override', () => {
    const file = JSON.parse(JSON.stringify(validScenarioFile)) as ScenarioFile;
    firstScenarioOf(file).route = '/checkout';
    const parsed = validateScenarioShape(file);
    expect(parsed.scenarios[0]?.route).toBe('/checkout');
  });

  it('rejects protocol-relative route at file and scenario level', () => {
    const file = JSON.parse(JSON.stringify(validScenarioFile)) as ScenarioFile;
    file.route = '//evil.com';
    expect(() => validateScenarioShape(file)).toThrowError();

    const file2 = JSON.parse(JSON.stringify(validScenarioFile)) as ScenarioFile;
    firstScenarioOf(file2).route = '//evil.com';
    expect(() => validateScenarioShape(file2)).toThrowError();
  });
});
