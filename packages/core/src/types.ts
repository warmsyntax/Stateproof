export const SCHEMA_VERSION = 1;
export const DEFAULT_TIMEOUT_MS = 15000;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
export const HTTP_METHOD_LIST = HTTP_METHODS;

export interface Viewport {
  name: string;
  width: number;
  height: number;
  deviceScaleFactor?: number | undefined;
  isMobile?: boolean | undefined;
}

export interface RequestRule {
  method: HttpMethod;
  urlPattern: string;
}

export interface DelayResponse {
  mode: 'delay';
  milliseconds: number;
}

export interface FixtureResponse {
  mode: 'fixture';
  path: string;
  status?: number | undefined;
  headers?: Record<string, string> | undefined;
}

export interface InlineResponse {
  mode: 'inline';
  status?: number | undefined;
  body: unknown;
  headers?: Record<string, string> | undefined;
}

export interface ErrorResponse {
  mode: 'error';
  status: number;
  body?: unknown | undefined;
  headers?: Record<string, string> | undefined;
}

export interface OfflineResponse {
  mode: 'offline';
}

export type ResponseRule =
  | DelayResponse
  | FixtureResponse
  | InlineResponse
  | ErrorResponse
  | OfflineResponse;

export interface ExpectRule {
  visible?: string | string[] | undefined;
  hidden?: string | string[] | undefined;
  text?: Record<string, string> | undefined;
  attributes?: Record<string, Record<string, string | boolean>> | undefined;
  timeoutMs?: number | undefined;
  stableMs?: number | undefined;
}

export interface RecoveryAction {
  type: 'click';
  selector: string;
}

export interface RecoveryRule {
  action: RecoveryAction;
  response: ResponseRule;
  expect: ExpectRule;
}

export interface WebSocketRule {
  urlPattern: string;
  mode: 'drop-connection' | 'close';
  afterMs?: number | undefined;
}

export interface Scenario {
  id: string;
  label?: string | undefined;
  note?: string | undefined;
  route?: string | undefined;
  request?: RequestRule | undefined;
  response?: ResponseRule | undefined;
  websocket?: WebSocketRule | undefined;
  expect: ExpectRule;
  recovery?: RecoveryRule | undefined;
}

export interface ScenarioFile {
  $schema?: string | undefined;
  $comment?: string | undefined;
  name: string;
  baseUrl: string;
  route: string;
  viewports?: Viewport[] | undefined;
  scenarios: Scenario[];
}

export const DEFAULT_VIEWPORTS: Viewport[] = [
  { name: 'desktop', width: 1440, height: 1024, deviceScaleFactor: 1, isMobile: false },
  { name: 'mobile', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
];

export const FAILURE_CODES = [
  'selector-timeout',
  'request-not-intercepted',
  'selector-unstable',
  'navigation-failed',
  'capture-failed',
  'fixture-missing',
  'fixture-invalid',
  'fixture-path-forbidden',
  'body-not-serializable',
  'route-handler-failed',
  'non-loopback-redirect',
  'browser-error',
  'app-unreachable',
  'artifact-locked',
  'internal-error',
  'visual-diff-exceeded',
  'recovery-action-failed',
  'recovery-timeout',
  'text-mismatch',
  'attribute-mismatch',
  'element-not-hidden',
  'websocket-not-intercepted',
  'unknown',
] as const;

export type FailureCode = (typeof FAILURE_CODES)[number];

export type ScenarioStatus = 'passed' | 'failed' | 'error' | 'aborted';

export interface ScenarioVisualDiff {
  baseline?: string | undefined;
  current?: string | undefined;
  diff?: string | undefined;
  diffRatio?: number | undefined;
  threshold?: number | undefined;
}

export interface RecoveryOutcome {
  status: 'passed' | 'failed';
  durationMs: number;
  screenshot?: string | undefined;
}

export interface ScenarioOutcome {
  id: string;
  label?: string | undefined;
  route?: string | undefined;
  viewport: Viewport;
  status: ScenarioStatus;
  failureCode?: FailureCode | undefined;
  message?: string | undefined;
  hint?: string | undefined;
  suggestions?:
    | {
        selectors: string[];
      }
    | undefined;
  visualDiff?: ScenarioVisualDiff | undefined;
  recovery?: RecoveryOutcome | undefined;
  artifacts: {
    screenshot?: string | undefined;
    recoveryScreenshot?: string | undefined;
  };
  durationMs: number;
}

export interface RunResult {
  schemaVersion: typeof SCHEMA_VERSION;
  runId: string;
  stateproofVersion: string;
  browserVersion: string;
  startedAt: string;
  finishedAt: string;
  baseUrl: string;
  file: string;
  scenarios: ScenarioOutcome[];
}

export type RunResultData = RunResult;
