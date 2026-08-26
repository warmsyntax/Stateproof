import { z } from 'zod';
import { StateproofError } from './errors.js';
import { HTTP_METHOD_LIST, type ScenarioFile } from './types.js';

export const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const kebab = z
  .string()
  .regex(KEBAB_CASE, 'must be kebab-case (lowercase letters/digits separated by single hyphens)');

const httpStatus = z.number().int();
const headersRecord = z.record(z.string(), z.string());

const viewportSchema = z.strictObject({
  name: kebab,
  width: z.number().int().min(320).max(3840),
  height: z.number().int().min(320).max(3840),
  deviceScaleFactor: z.number().positive().optional(),
  isMobile: z.boolean().optional(),
});

const requestSchema = z.strictObject({
  method: z.enum(HTTP_METHOD_LIST),
  urlPattern: z.string().min(1),
});

const responseSchema = z.discriminatedUnion('mode', [
  z.strictObject({
    mode: z.literal('delay'),
    milliseconds: z.number().int().min(1).max(60000),
  }),
  z.strictObject({
    mode: z.literal('fixture'),
    path: z.string().min(1),
    status: httpStatus.optional(),
    headers: headersRecord.optional(),
  }),
  z.strictObject({
    mode: z.literal('inline'),
    status: httpStatus.optional(),
    body: z.unknown(),
    headers: headersRecord.optional(),
  }),
  z.strictObject({
    mode: z.literal('error'),
    status: z.number().int().min(400).max(599),
    body: z.unknown().optional(),
    headers: headersRecord.optional(),
  }),
  z.strictObject({
    mode: z.literal('offline'),
  }),
]);

const expectSchema = z
  .strictObject({
    visible: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
    hidden: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
    text: z.record(z.string(), z.string()).optional(),
    attributes: z
      .record(z.string(), z.record(z.string(), z.union([z.string(), z.boolean()])))
      .optional(),
    timeoutMs: z.number().int().positive().optional(),
    stableMs: z.number().int().min(0).optional(),
  })
  .refine(
    (data) =>
      data.visible !== undefined ||
      data.hidden !== undefined ||
      data.text !== undefined ||
      data.attributes !== undefined,
    'expect must specify at least one assertion rule (visible, hidden, text, or attributes)',
  );

const recoveryActionSchema = z.strictObject({
  type: z.literal('click'),
  selector: z.string().min(1),
});

const recoverySchema = z.strictObject({
  action: recoveryActionSchema,
  response: responseSchema,
  expect: expectSchema,
});

const webSocketSchema = z.strictObject({
  urlPattern: z.string().min(1),
  mode: z.enum(['drop-connection', 'close']),
  afterMs: z.number().int().min(0).optional(),
});

const scenarioSchema = z
  .strictObject({
    id: kebab,
    label: z.string().min(1).optional(),
    note: z.string().min(1).optional(),
    route: z
      .string()
      .refine(
        (value) => value.startsWith('/') && !value.startsWith('//'),
        "route must start with a single '/' and cannot be protocol-relative",
      )
      .optional(),
    request: requestSchema.optional(),
    response: responseSchema.optional(),
    websocket: webSocketSchema.optional(),
    expect: expectSchema,
    recovery: recoverySchema.optional(),
  })
  .refine(
    (data) =>
      (data.request !== undefined && data.response !== undefined) || data.websocket !== undefined,
    'scenario must specify either (request and response) for HTTP interception or (websocket) for WebSocket simulation',
  );

export const scenarioFileSchema = z.strictObject({
  $schema: z.string().optional(),
  $comment: z.string().optional(),
  name: kebab,
  baseUrl: z.string().refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'baseUrl must be an absolute http:// or https:// URL'),
  route: z
    .string()
    .refine(
      (value) => value.startsWith('/') && !value.startsWith('//'),
      "route must start with a single '/' and cannot be protocol-relative",
    ),
  viewports: z.array(viewportSchema).min(1).optional(),
  scenarios: z.array(scenarioSchema).min(1),
});

export function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.map(String).join('.') : '<root>';
      return `  ${path}: ${issue.message}`;
    })
    .join('\n');
}

export function validateScenarioShape(value: unknown): ScenarioFile {
  const result = scenarioFileSchema.safeParse(value);
  if (!result.success) {
    const details = formatZodIssues(result.error);
    throw new StateproofError({
      code: 'SCHEMA_INVALID',
      message: `Scenario file failed schema validation:\n${details}`,
      hint: 'Fix the listed fields. Field names and shapes are defined by the v1 scenario schema.',
    });
  }
  // Zod's inferred optionals include explicit `undefined`, which conflicts with
  // exactOptionalPropertyTypes on our hand-written contract types.
  return result.data as ScenarioFile;
}
