export const CLI_ERROR_CODES = [
  'SCENARIO_FILE_MISSING',
  'SCENARIO_FILE_INVALID_JSON',
  'SCHEMA_INVALID',
  'DUPLICATE_SCENARIO_ID',
  'DUPLICATE_VIEWPORT_NAME',
  'PATTERN_TOO_BROAD',
  'PATTERN_CROSS_ORIGIN',
  'FIXTURE_MISSING',
  'FIXTURE_PATH_FORBIDDEN',
  'FIXTURE_TOO_LARGE',
  'FIXTURE_INVALID_JSON',
  'BODY_NOT_SERIALIZABLE',
  'NON_LOOPBACK_URL',
  'NON_LOOPBACK_REDIRECT',
  'APP_UNREACHABLE',
  'BROWSER_MISSING',
  'NO_SCENARIOS_SELECTED',
  'NO_VIEWPORTS_SELECTED',
  'ARTIFACT_LOCKED',
  'EXPORT_RUN_MISSING',
  'SECRET_SCAN_FAILED',
  'INTERNAL_ERROR',
] as const;

export type CliErrorCode = (typeof CLI_ERROR_CODES)[number];

const EXIT_BY_CODE: Record<CliErrorCode, 2 | 3 | 4> = {
  SCENARIO_FILE_MISSING: 2,
  SCENARIO_FILE_INVALID_JSON: 2,
  SCHEMA_INVALID: 2,
  DUPLICATE_SCENARIO_ID: 2,
  DUPLICATE_VIEWPORT_NAME: 2,
  PATTERN_TOO_BROAD: 2,
  PATTERN_CROSS_ORIGIN: 2,
  FIXTURE_MISSING: 2,
  FIXTURE_PATH_FORBIDDEN: 2,
  FIXTURE_TOO_LARGE: 2,
  FIXTURE_INVALID_JSON: 2,
  BODY_NOT_SERIALIZABLE: 2,
  NON_LOOPBACK_URL: 2,
  NON_LOOPBACK_REDIRECT: 2,
  APP_UNREACHABLE: 3,
  BROWSER_MISSING: 3,
  NO_SCENARIOS_SELECTED: 2,
  NO_VIEWPORTS_SELECTED: 2,
  ARTIFACT_LOCKED: 2,
  EXPORT_RUN_MISSING: 2,
  SECRET_SCAN_FAILED: 2,
  INTERNAL_ERROR: 4,
};

export function exitCodeFor(code: CliErrorCode): 2 | 3 | 4 {
  return EXIT_BY_CODE[code];
}

export interface StateproofErrorOptions {
  code: CliErrorCode;
  message: string;
  hint: string;
  file?: string;
  runId?: string | null;
  cause?: unknown;
}

export class StateproofError extends Error {
  readonly code: CliErrorCode;
  readonly hint: string;
  readonly file?: string;
  readonly runId?: string | null;

  constructor(options: StateproofErrorOptions) {
    super(options.message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'StateproofError';
    this.code = options.code;
    this.hint = options.hint;
    if (options.file !== undefined) this.file = options.file;
    this.runId = options.runId ?? null;
  }
}
