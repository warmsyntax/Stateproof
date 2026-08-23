import { SCHEMA_VERSION } from './types.js';

export const ENVELOPE_TYPES = [
  'init.result',
  'list.result',
  'run.result',
  'export.card',
  'error',
] as const;

export type EnvelopeType = (typeof ENVELOPE_TYPES)[number];

export interface EnvelopeError {
  code: string;
  message: string;
  hint: string;
  file?: string;
  runId: string | null;
}

export interface Envelope<T> {
  ok: boolean;
  schemaVersion: typeof SCHEMA_VERSION;
  type: EnvelopeType;
  data: T | null;
  error: EnvelopeError | null;
}

export interface EnvelopeInput<T> {
  type: EnvelopeType;
  data?: T | null;
  error?: EnvelopeError | null;
  exitCode: number;
}

// Contract §7.1: `ok` is true only when the process exit code is 0.
// A completed run with scenario failures therefore carries data AND ok=false.
export function buildEnvelope<T>(input: EnvelopeInput<T>): Envelope<T> {
  return {
    ok: input.exitCode === 0,
    schemaVersion: SCHEMA_VERSION,
    type: input.type,
    data: input.data ?? null,
    error: input.error ? { ...input.error, runId: input.error.runId ?? null } : null,
  };
}
