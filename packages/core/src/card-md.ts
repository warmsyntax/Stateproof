import type { RunResult, ScenarioOutcome } from './types.js';

const STATUS_WORDS = {
  passed: 'PASS',
  failed: 'FAIL',
  error: 'ERROR',
} as const;

export function statusWord(status: ScenarioOutcome['status']): string {
  return STATUS_WORDS[status];
}

export interface CardSource {
  result: RunResult;
  name: string;
  title?: string;
}

export function humanizeName(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|');
}

export function artifactBasename(path: string): string {
  const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return slash === -1 ? path : path.slice(slash + 1);
}

export interface CardGrid {
  columns: string[];
  rows: Array<{
    scenarioId: string;
    label?: string;
    cells: Record<string, ScenarioOutcome['status'] | 'missing'>;
    artifacts: string[];
  }>;
}

export function buildCardGrid(result: RunResult): CardGrid {
  const columns: string[] = [];
  for (const outcome of result.scenarios) {
    if (!columns.includes(outcome.viewport.name)) columns.push(outcome.viewport.name);
  }

  const byId = new Map<string, ScenarioOutcome[]>();
  for (const outcome of result.scenarios) {
    const list = byId.get(outcome.id) ?? [];
    list.push(outcome);
    byId.set(outcome.id, list);
  }

  const rows = [...byId.entries()].map(([scenarioId, outcomes]) => {
    const cells: Record<string, ScenarioOutcome['status'] | 'missing'> = {};
    for (const column of columns) {
      const match = outcomes.find((outcome) => outcome.viewport.name === column);
      cells[column] = match ? match.status : 'missing';
    }
    const artifacts: string[] = [];
    for (const outcome of outcomes) {
      if (outcome.artifacts.screenshot !== undefined) {
        artifacts.push(artifactBasename(outcome.artifacts.screenshot));
      }
    }
    const label = outcomes[0]?.label;
    return {
      scenarioId,
      ...(label === undefined ? {} : { label }),
      cells,
      artifacts,
    };
  });

  return { columns, rows };
}

export function renderMarkdownCard(source: CardSource): string {
  const headingTitle = escapeCell(source.title ?? humanizeName(source.name));
  const lines: string[] = [];

  lines.push(`## Stateproof Card — ${headingTitle}`);
  lines.push('');

  const { columns, rows } = buildCardGrid(source.result);
  if (columns.length > 0 && rows.length > 0) {
    lines.push(`| State | ${columns.join(' | ')} |`);
    lines.push(`|---${columns.map(() => ':---:').join('|')}|`);
    for (const row of rows) {
      const label = escapeCell(row.label ?? row.scenarioId);
      const cells = columns.map((column) => {
        const cell = row.cells[column];
        return cell === undefined || cell === 'missing' ? 'ERROR' : statusWord(cell);
      });
      lines.push(`| ${label} | ${cells.join(' | ')} |`);
    }
  }

  const artifactNames = [...new Set(rows.flatMap((row) => row.artifacts))];
  if (artifactNames.length > 0) {
    lines.push('');
    lines.push(
      `**Artifacts:** \`artifacts/stateproof/${source.name}/\` — ${artifactNames.join(' · ')}`,
    );
  }

  lines.push('');
  lines.push(
    `**Run:** local · Stateproof ${source.result.stateproofVersion} · Chromium ${source.result.browserVersion} · runId ${source.result.runId} · ${source.result.finishedAt}`,
  );
  lines.push('');
  return lines.join('\n');
}
