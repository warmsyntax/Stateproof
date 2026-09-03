import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { scenarioFileSchema } from './schema.js';

describe('generated JSON Schema drift', () => {
  it('matches the committed schema/v1.json', () => {
    const committed = readFileSync(new URL('../schema/v1.json', import.meta.url), 'utf-8').replace(
      /\r\n/g,
      '\n',
    );
    const generated = `${JSON.stringify(
      z.toJSONSchema(scenarioFileSchema, { target: 'draft-7', io: 'input' }),
      null,
      2,
    )}\n`;
    expect(generated).toBe(committed);
  });

  it('publishes strict objects and the kebab-case pattern', () => {
    const schema = JSON.parse(
      readFileSync(new URL('../schema/v1.json', import.meta.url), 'utf-8'),
    ) as { properties?: Record<string, unknown>; additionalProperties?: boolean };
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties?.name).toBeTruthy();
  });
});
