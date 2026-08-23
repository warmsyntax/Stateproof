import { describe, expect, it } from 'vitest';
import { StateproofError } from './errors.js';
import { parseScenarioText } from './parse.js';

const FILE = 'stateproof.scenarios.json';

describe('parseScenarioText', () => {
  it('parses strict JSON objects', () => {
    const { value } = parseScenarioText('{"name":"x"}', FILE);
    expect(value).toEqual({ name: 'x' });
  });

  it('strips a UTF-8 BOM before parsing', () => {
    const { value } = parseScenarioText('\uFEFF{"name":"x"}', FILE);
    expect(value).toEqual({ name: 'x' });
  });

  it('reports line and column for a syntax error', () => {
    expect(() => parseScenarioText('{\n  "name": "x",\n}', FILE)).toThrowError(StateproofError);
    try {
      parseScenarioText('{\n  "name": "x",\n}', FILE);
      throw new Error('expected failure');
    } catch (error) {
      const spe = error as StateproofError;
      expect(spe.code).toBe('SCENARIO_FILE_INVALID_JSON');
      expect(spe.message).toContain(`${FILE}:3:`);
      expect(spe.hint).toMatch(/trailing comma|syntax/i);
    }
  });

  it('rejects comments with a located error', () => {
    expect(() => parseScenarioText('{\n  // hello\n  "name": "x"\n}', FILE)).toThrowError(
      StateproofError,
    );
  });

  it('rejects single-quoted strings', () => {
    expect(() => parseScenarioText("{ 'name': 'x' }", FILE)).toThrowError(StateproofError);
  });

  it('reports an empty file clearly', () => {
    try {
      parseScenarioText('   \n ', FILE);
      throw new Error('expected failure');
    } catch (error) {
      const spe = error as StateproofError;
      expect(spe.code).toBe('SCENARIO_FILE_INVALID_JSON');
      expect(spe.message).toContain('file is empty');
    }
  });
});
