import { StateproofError } from './errors.js';
import type { ScenarioFile } from './types.js';

export const MAX_FIXTURE_BYTES = 1024 * 1024;
const WILDCARD_SEGMENT = /^\*+$/;

function isAbsoluteFixturePath(path: string): boolean {
  if (path.startsWith('/') || path.startsWith('\\')) return true;
  if (/^[a-zA-Z]:/.test(path)) return true;
  return path.startsWith('\\\\');
}

export function isForbiddenFixturePath(path: string): boolean {
  if (path.length === 0) return true;
  if (isAbsoluteFixturePath(path)) return true;
  const segments = path.split(/[\\/]/);
  return segments.some((segment) => segment === '..');
}

export function isBroadPattern(pattern: string): boolean {
  const segments = pattern.split('/').filter((segment) => segment.length > 0);
  if (segments.length === 0) return true;
  return segments.every((segment) => WILDCARD_SEGMENT.test(segment));
}

export function isCrossOriginPattern(pattern: string): boolean {
  return pattern.startsWith('http://') || pattern.startsWith('https://');
}

interface SerializableCheck {
  ok: boolean;
  reason?: string;
}

function checkSerializable(value: unknown, seen: Set<object>): SerializableCheck {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    typeof value === 'number'
  ) {
    return { ok: true };
  }
  if (typeof value === 'undefined') return { ok: false, reason: 'undefined value' };
  if (typeof value === 'function') return { ok: false, reason: 'function' };
  if (typeof value === 'symbol') return { ok: false, reason: 'symbol' };
  if (typeof value === 'bigint') return { ok: false, reason: 'BigInt' };
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? { ok: false, reason: 'invalid Date' } : { ok: true };
  }
  if (typeof value !== 'object') {
    return { ok: false, reason: `unsupported type ${typeof value}` };
  }
  const obj = value as object;
  if (seen.has(obj)) return { ok: false, reason: 'circular reference' };
  seen.add(obj);
  try {
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const result = checkSerializable(item, seen);
        if (!result.ok) return result;
      }
      return { ok: true };
    }
    const proto = Object.getPrototypeOf(obj) as object | null;
    if (proto !== Object.prototype && proto !== null) {
      return { ok: false, reason: 'non-plain object' };
    }
    for (const entry of Object.entries(obj)) {
      if (Object.hasOwn(obj, entry[0]) && entry[1] === undefined) {
        return { ok: false, reason: `undefined value at key ${entry[0]}` };
      }
      const result = checkSerializable(entry[1], seen);
      if (!result.ok) return result;
    }
    return { ok: true };
  } finally {
    seen.delete(obj);
  }
}

export function bodySerializationProblem(body: unknown): string | null {
  const check = checkSerializable(body, new Set());
  if (!check.ok) return check.reason ?? 'not JSON-serializable';
  try {
    if (JSON.stringify(body).length > MAX_FIXTURE_BYTES) return 'serialized body exceeds 1 MB';
  } catch {
    return 'JSON.stringify failed';
  }
  return null;
}

const SELECTOR_PREFIXES_REQUIRING_RUNTIME_FEATURES = ['text=', 'xpath=', '//'];

function selectorProblems(visible: string | string[]): string[] {
  const selectors = Array.isArray(visible) ? visible : [visible];
  return selectors.filter((selector) =>
    SELECTOR_PREFIXES_REQUIRING_RUNTIME_FEATURES.some((prefix) => selector.startsWith(prefix)),
  );
}

export interface SemanticIssue {
  code:
    | 'DUPLICATE_SCENARIO_ID'
    | 'DUPLICATE_VIEWPORT_NAME'
    | 'PATTERN_TOO_BROAD'
    | 'PATTERN_CROSS_ORIGIN'
    | 'FIXTURE_PATH_FORBIDDEN'
    | 'BODY_NOT_SERIALIZABLE'
    | 'SCHEMA_INVALID';
  message: string;
  hint: string;
}

export function collectSemanticIssues(file: ScenarioFile): SemanticIssue[] {
  const issues: SemanticIssue[] = [];

  const idCounts = new Map<string, number>();
  for (const scenario of file.scenarios) {
    idCounts.set(scenario.id, (idCounts.get(scenario.id) ?? 0) + 1);
  }
  for (const [id, count] of idCounts) {
    if (count > 1) {
      issues.push({
        code: 'DUPLICATE_SCENARIO_ID',
        message: `Scenario id "${id}" appears ${count} times; ids must be unique within the file.`,
        hint: 'Rename the duplicate scenarios so each id is unique.',
      });
    }
  }

  if (file.viewports) {
    const nameCounts = new Map<string, number>();
    for (const viewport of file.viewports) {
      nameCounts.set(viewport.name, (nameCounts.get(viewport.name) ?? 0) + 1);
    }
    for (const [name, count] of nameCounts) {
      if (count > 1) {
        issues.push({
          code: 'DUPLICATE_VIEWPORT_NAME',
          message: `Viewport name "${name}" appears ${count} times; names must be unique.`,
          hint: 'Give every viewport a distinct kebab-case name.',
        });
      }
    }
  }

  for (const scenario of file.scenarios) {
    const { urlPattern } = scenario.request;
    if (isCrossOriginPattern(urlPattern)) {
      issues.push({
        code: 'PATTERN_CROSS_ORIGIN',
        message: `Scenario "${scenario.id}": urlPattern must be a path glob and cannot start with http:// or https://.`,
        hint: `Use a pathname glob such as "**/api/account"; the origin comes from baseUrl.`,
      });
      continue;
    }
    if (isBroadPattern(urlPattern)) {
      issues.push({
        code: 'PATTERN_TOO_BROAD',
        message: `Scenario "${scenario.id}": urlPattern "${urlPattern}" matches everything.`,
        hint: 'Narrow the pattern to a real API path prefix such as "**/api/**".',
      });
    }

    if (scenario.response.mode === 'fixture' && isForbiddenFixturePath(scenario.response.path)) {
      issues.push({
        code: 'FIXTURE_PATH_FORBIDDEN',
        message: `Scenario "${scenario.id}": fixture path "${scenario.response.path}" is absolute or escapes the scenario directory.`,
        hint: 'Use a relative path inside the scenario file directory, e.g. "fixtures/account-empty.json".',
      });
    }

    if (scenario.response.mode === 'inline') {
      const problem = bodySerializationProblem(scenario.response.body);
      if (problem) {
        issues.push({
          code: 'BODY_NOT_SERIALIZABLE',
          message: `Scenario "${scenario.id}": inline body ${problem}.`,
          hint: 'Inline bodies must be JSON-serializable data no larger than 1 MB.',
        });
      }
    }
    if (scenario.response.mode === 'error' && scenario.response.body !== undefined) {
      const problem = bodySerializationProblem(scenario.response.body);
      if (problem) {
        issues.push({
          code: 'BODY_NOT_SERIALIZABLE',
          message: `Scenario "${scenario.id}": error body ${problem}.`,
          hint: 'Error bodies must be JSON-serializable data.',
        });
      }
    }

    const badSelectors = selectorProblems(scenario.expect.visible);
    for (const selector of badSelectors) {
      issues.push({
        code: 'SCHEMA_INVALID',
        message: `Scenario "${scenario.id}": selector "${selector}" uses non-CSS syntax.`,
        hint: 'v0.1 supports CSS selectors only; text=, xpath=, and XPath expressions are not supported.',
      });
    }
  }

  return issues;
}

export function validateSemantics(file: ScenarioFile): void {
  for (const issue of collectSemanticIssues(file)) {
    throw new StateproofError({
      code: issue.code,
      message: issue.message,
      hint: issue.hint,
    });
  }
}
