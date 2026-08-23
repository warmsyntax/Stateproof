import { buildCardGrid, type CardSource } from './card-md.js';
import { buildEnvelope, type Envelope } from './envelope.js';

export interface JsonCardData {
  name: string;
  runId: string;
  stateproofVersion: string;
  browserVersion: string;
  finishedAt: string;
  columns: string[];
  rows: Array<{
    scenarioId: string;
    label?: string;
    cells: Record<string, 'passed' | 'failed' | 'error'>;
  }>;
  artifacts: string[];
}

export function buildJsonCard(source: CardSource): JsonCardData {
  const grid = buildCardGrid(source.result);
  return {
    name: source.name,
    runId: source.result.runId,
    stateproofVersion: source.result.stateproofVersion,
    browserVersion: source.result.browserVersion,
    finishedAt: source.result.finishedAt,
    columns: grid.columns,
    rows: grid.rows.map((row) => ({
      scenarioId: row.scenarioId,
      ...(row.label === undefined ? {} : { label: row.label }),
      cells: Object.fromEntries(
        grid.columns.map((column) => {
          const cell = row.cells[column];
          const status = cell === undefined || cell === 'missing' ? 'error' : cell;
          return [column, status];
        }),
      ),
    })),
    artifacts: [...new Set(grid.rows.flatMap((row) => row.artifacts))],
  };
}

export function jsonCardEnvelope(source: CardSource, exitCode: number): Envelope<JsonCardData> {
  return buildEnvelope({ type: 'export.card', data: buildJsonCard(source), exitCode });
}
