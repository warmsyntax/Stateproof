import { type ParseError, parse as parseJsonc } from 'jsonc-parser';
import { StateproofError } from './errors.js';

const BOM = 0xfeff;

function lineCol(text: string, offset: number): { line: number; column: number } {
  const upto = text.slice(0, Math.min(offset, text.length));
  const line = (upto.match(/\n/g) ?? []).length + 1;
  const lastBreak = upto.lastIndexOf('\n');
  const column = offset - lastBreak;
  return { line, column };
}

function syntaxLabel(code: number): string {
  switch (code) {
    case 1:
      return 'invalid symbol';
    case 2:
      return 'invalid number format';
    case 3:
      return 'unexpected end of file';
    case 4:
      return 'invalid character';
    case 5:
      return 'invalid comment token';
    case 6:
      return 'property names must be double-quoted strings';
    case 7:
      return 'trailing comma';
    case 8:
      return 'duplicate property key';
    default:
      return 'syntax error';
  }
}

export interface ParsedScenarioFile {
  value: unknown;
  text: string;
}

export function parseScenarioText(raw: string, file: string): ParsedScenarioFile {
  const text = raw.charCodeAt(0) === BOM ? raw.slice(1) : raw;
  if (text.trim().length === 0) {
    throw new StateproofError({
      code: 'SCENARIO_FILE_INVALID_JSON',
      message: `${file}:1:1: file is empty`,
      hint: 'Run stateproof init to scaffold a scenario file, or write a strict JSON object.',
      file,
    });
  }
  try {
    return { value: JSON.parse(text) as unknown, text };
  } catch {
    // Strict JSON.parse failed; jsonc-parser is used only to locate the offending offset.
    const errors: ParseError[] = [];
    parseJsonc(text, errors, { allowTrailingComma: false, disallowComments: true });
    const first = errors[0];
    if (first) {
      const { line, column } = lineCol(text, first.offset);
      throw new StateproofError({
        code: 'SCENARIO_FILE_INVALID_JSON',
        message: `${file}:${line}:${column}: ${syntaxLabel(first.error)}`,
        hint: 'Fix the JSON syntax at the location above. Comments and trailing commas are not allowed.',
        file,
      });
    }
    throw new StateproofError({
      code: 'SCENARIO_FILE_INVALID_JSON',
      message: `${file}:1:1: ${text.trim().length === 0 ? 'file is empty' : 'file is not valid JSON'}`,
      hint: 'Ensure the file contains a single strict JSON object.',
      file,
    });
  }
}
