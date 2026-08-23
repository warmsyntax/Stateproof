import { type CliErrorCode, exitCodeFor } from './errors.js';
import type { ScenarioOutcome } from './types.js';

export const EXIT_PASS = 0;
export const EXIT_SCENARIO_FAILURE = 1;
export const EXIT_USAGE = 2;
export const EXIT_ENVIRONMENT = 3;
export const EXIT_INTERNAL = 4;

export type FatalKind = 'environment' | 'internal';

export interface ExitInput {
  outcomes: Pick<ScenarioOutcome, 'status'>[];
  fatal?: FatalKind;
}

// Precedence per contract §7.3: internal > environment > scenario error > failure > pass.
export function computeExitCode(input: ExitInput): number {
  if (input.fatal === 'internal') return EXIT_INTERNAL;
  if (input.fatal === 'environment') return EXIT_ENVIRONMENT;
  if (input.outcomes.some((outcome) => outcome.status === 'error')) return EXIT_INTERNAL;
  if (input.outcomes.some((outcome) => outcome.status === 'failed')) return EXIT_SCENARIO_FAILURE;
  return EXIT_PASS;
}

export type { CliErrorCode };
export { exitCodeFor };
