import type { RunResult } from '@stateproof-dev/core';
import pc from 'picocolors';

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function renderHumanRunSummary(
  name: string,
  result: RunResult,
  artifactDir: string,
  exitCode: number,
): string {
  const lines: string[] = [];

  lines.push(pc.dim(`STATEPROOF ${result.stateproofVersion} — runtime validation`));
  lines.push('');

  const scenarioCount = new Set(result.scenarios.map((s) => s.id)).size;
  const viewportCount = new Set(result.scenarios.map((s) => s.viewport.name)).size;
  lines.push(pc.bold(`${name} · ${scenarioCount} scenarios × ${viewportCount} viewports`));
  lines.push('');

  for (const outcome of result.scenarios) {
    const statusText =
      outcome.status === 'passed'
        ? pc.green(pc.bold('PASS'))
        : outcome.status === 'failed'
          ? pc.red(pc.bold('FAIL'))
          : pc.red(pc.bold('ERROR'));

    const idText = outcome.id.padEnd(20, ' ');
    const vpText = outcome.viewport.name.padEnd(10, ' ');
    const durationText = formatDuration(outcome.durationMs).padEnd(8, ' ');
    const msgText = outcome.message ? pc.dim(outcome.message) : '';

    lines.push(`  ${statusText}  ${idText} ${vpText} ${durationText} ${msgText}`);

    if (outcome.status !== 'passed') {
      if (outcome.artifacts.screenshot) {
        lines.push(`        ${pc.dim('artifact')} ${artifactDir}/${outcome.artifacts.screenshot}`);
      }
      if (outcome.hint) {
        lines.push(`        ${pc.cyan('hint')}     ${outcome.hint}`);
      }
    }
  }

  lines.push('');

  const passed = result.scenarios.filter((s) => s.status === 'passed').length;
  const failed = result.scenarios.filter((s) => s.status === 'failed').length;
  const errorCount = result.scenarios.filter((s) => s.status === 'error').length;

  const counts: string[] = [];
  if (passed > 0) counts.push(pc.green(`${passed} passed`));
  if (failed > 0) counts.push(pc.red(`${failed} failed`));
  if (errorCount > 0) counts.push(pc.red(`${errorCount} error`));

  lines.push(`${counts.join(' · ')}`.padEnd(50, ' ') + pc.dim(`exit ${exitCode}`));

  return lines.join('\n');
}

export interface HumanListSummaryInput {
  name: string;
  baseUrl: string;
  route: string;
  viewports?: Array<{ name: string; width: number; height: number }> | undefined;
  scenarios: Array<{
    id: string;
    label?: string | undefined;
    note?: string | undefined;
    request?: { method: string; urlPattern: string } | undefined;
    websocket?: { urlPattern: string } | undefined;
  }>;
}

export function renderHumanListSummary(file: HumanListSummaryInput): string {
  const lines: string[] = [];
  lines.push(pc.dim('STATEPROOF — scenario list'));
  lines.push('');
  lines.push(pc.bold(`${file.name} (${file.baseUrl}${file.route})`));
  lines.push('');

  const viewports = file.viewports ?? [
    { name: 'desktop', width: 1440, height: 1024 },
    { name: 'mobile', width: 390, height: 844 },
  ];

  lines.push(
    pc.dim(
      `Viewports (${viewports.length}): ${viewports.map((v) => `${v.name} (${v.width}x${v.height})`).join(', ')}`,
    ),
  );
  lines.push(pc.dim(`Scenarios (${file.scenarios.length}):`));
  lines.push('');

  for (const s of file.scenarios) {
    const label = s.label ? ` (${s.label})` : '';
    const reqDesc = s.request
      ? `${s.request.method} ${s.request.urlPattern}`
      : s.websocket
        ? `WS ${s.websocket.urlPattern}`
        : '';
    lines.push(`  • ${pc.bold(s.id)}${label}${reqDesc ? ` — ${reqDesc}` : ''}`);
    if (s.note) {
      lines.push(`    ${pc.dim(s.note)}`);
    }
  }

  return lines.join('\n');
}
