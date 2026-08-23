import { StateproofError } from './errors.js';
import { MAX_FIXTURE_BYTES } from './validate.js';

const decoder = new TextDecoder('utf-8');

export function isJsonFixturePath(path: string): boolean {
  return path.toLowerCase().endsWith('.json');
}

export function assertFixtureContent(fileName: string, bytes: Uint8Array): void {
  if (bytes.byteLength > MAX_FIXTURE_BYTES) {
    throw new StateproofError({
      code: 'FIXTURE_TOO_LARGE',
      message: `Fixture "${fileName}" is ${bytes.byteLength} bytes; the limit is ${MAX_FIXTURE_BYTES} bytes.`,
      hint: 'Trim the fixture to at most 1 MB.',
      file: fileName,
    });
  }
  if (!isJsonFixturePath(fileName)) return;
  const text = decoder.decode(bytes);
  try {
    JSON.parse(text);
  } catch {
    throw new StateproofError({
      code: 'FIXTURE_INVALID_JSON',
      message: `Fixture "${fileName}" does not parse as valid JSON.`,
      hint: 'Fix the fixture JSON or rename the file if it is not meant to be JSON.',
      file: fileName,
    });
  }
}
