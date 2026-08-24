import { buildEnvelope, type Envelope, type EnvelopeError, type EnvelopeType } from '@stateproof/core';

export function emitJsonEnvelope<T>(
  input:
    | Envelope<T>
    | {
        type: EnvelopeType;
        data?: T | null | undefined;
        error?: EnvelopeError | null | undefined;
        exitCode: number;
      },
): void {
  const envelope =
    'ok' in input && 'schemaVersion' in input
      ? input
      : buildEnvelope({
          type: input.type,
          data: input.data ?? null,
          error: input.error ?? null,
          exitCode: input.exitCode,
        });
  process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
}
