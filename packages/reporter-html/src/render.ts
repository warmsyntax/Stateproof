import type { RunResult, ScenarioOutcome, Viewport } from '@stateproof-dev/core';
import { escapeHtml } from './escape.js';
import { INLINE_REPORT_STYLES } from './styles.js';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function renderBadge(status: ScenarioOutcome['status']): string {
  switch (status) {
    case 'passed':
      return '<span class="sp-badge sp-badge-pass" aria-label="Passed">✓ PASS</span>';
    case 'failed':
      return '<span class="sp-badge sp-badge-fail" aria-label="Failed">× FAIL</span>';
    case 'error':
      return '<span class="sp-badge sp-badge-error" aria-label="Error">! ERROR</span>';
    case 'aborted':
      return '<span class="sp-badge" style="color:var(--sp-text-faint);border-color:var(--sp-border-subtle)" aria-label="Aborted">⊘ ABORTED</span>';
  }
}

export function renderHtmlReport(result: RunResult): string {
  const scenarios: ScenarioOutcome[] = result.scenarios;
  const passedCount = scenarios.filter((s: ScenarioOutcome) => s.status === 'passed').length;
  const failedCount = scenarios.filter((s: ScenarioOutcome) => s.status === 'failed').length;
  const errorCount = scenarios.filter((s: ScenarioOutcome) => s.status === 'error').length;
  const totalDuration = scenarios.reduce(
    (acc: number, s: ScenarioOutcome) => acc + s.durationMs,
    0,
  );

  // Group scenarios and viewports
  const uniqueScenarioIds: string[] = Array.from(
    new Set(scenarios.map((s: ScenarioOutcome) => s.id)),
  );
  const uniqueViewports: Viewport[] = Array.from(
    new Map(scenarios.map((s: ScenarioOutcome) => [s.viewport.name, s.viewport])).values(),
  );

  // Outcome lookup map: `${scenarioId}:${viewportName}` -> outcome
  const outcomeMap = new Map<string, ScenarioOutcome>();
  for (const s of scenarios) {
    outcomeMap.set(`${s.id}:${s.viewport.name}`, s);
  }

  // Failures for failure details section
  const failedScenarios = scenarios.filter(
    (s: ScenarioOutcome) => s.status === 'failed' || s.status === 'error',
  );

  // Matrix table header
  const tableHeaders = uniqueViewports
    .map(
      (v: Viewport) =>
        `<th scope="col">${escapeHtml(v.name)}<br><span style="font-weight:400;font-size:11px;color:var(--sp-text-faint)">${v.width}×${v.height}</span></th>`,
    )
    .join('\n            ');

  // Matrix table rows
  const tableRows = uniqueScenarioIds
    .map((scenarioId: string) => {
      const firstOutcome = scenarios.find((s: ScenarioOutcome) => s.id === scenarioId);
      const label = firstOutcome?.label ?? scenarioId;
      const routeBadge = firstOutcome?.route
        ? `<div class="sp-scenario-route" style="font-family:monospace;font-size:11px;color:var(--sp-text-faint);margin-top:2px">${escapeHtml(firstOutcome.route)}</div>`
        : '';

      const cells = uniqueViewports
        .map((viewport: Viewport) => {
          const outcome = outcomeMap.get(`${scenarioId}:${viewport.name}`);
          if (!outcome)
            return '<td><span class="sp-badge" style="color:var(--sp-text-faint)">—</span></td>';
          return `<td>${renderBadge(outcome.status)}</td>`;
        })
        .join('\n            ');

      return `<tr>
          <th scope="row" class="sp-scenario-cell">
            <div class="sp-scenario-id">${escapeHtml(label)}</div>
            ${firstOutcome?.label && firstOutcome.label !== scenarioId ? `<div class="sp-scenario-note">${escapeHtml(scenarioId)}</div>` : ''}
            ${routeBadge}
          </th>
          ${cells}
        </tr>`;
    })
    .join('\n        ');

  // Screenshot gallery cards
  const galleryCards = scenarios
    .map((outcome: ScenarioOutcome) => {
      const screenshot = outcome.artifacts.screenshot;
      const recScreenshot = outcome.artifacts.recoveryScreenshot;
      const altText = `${escapeHtml(outcome.label ?? outcome.id)} on ${escapeHtml(outcome.viewport.name)} viewport (${outcome.viewport.width}x${outcome.viewport.height}) - status: ${outcome.status}`;
      const recoveryBadge = outcome.recovery
        ? outcome.recovery.status === 'passed'
          ? ' <span class="sp-badge sp-badge-pass" style="font-size:10px;padding:2px 6px">✓ RECOVERED</span>'
          : ' <span class="sp-badge sp-badge-fail" style="font-size:10px;padding:2px 6px">× RECOVERY FAILED</span>'
        : '';

      return `
      <div class="sp-screenshot-card" tabindex="0">
        <div class="sp-screenshot-frame">
          ${
            screenshot
              ? `<img src="assets/${escapeHtml(screenshot)}" alt="${altText}" class="sp-screenshot-img" loading="lazy" />`
              : `<span class="sp-text-muted" style="font-family:var(--sp-font-mono);font-size:13px">No screenshot captured</span>`
          }
          ${
            recScreenshot
              ? `<div style="margin-top:8px;border-top:1px dashed var(--sp-border);padding-top:8px">
                   <div style="font-size:11px;font-weight:600;margin-bottom:4px;color:var(--sp-accent)">RECOVERED STATE</div>
                   <img src="assets/${escapeHtml(recScreenshot)}" alt="${altText} (Recovered)" class="sp-screenshot-img" loading="lazy" />
                 </div>`
              : ''
          }
        </div>
        <div class="sp-screenshot-caption">
          <div class="sp-caption-top">
            <span class="sp-caption-id">${escapeHtml(outcome.id)}</span>
            ${renderBadge(outcome.status)}${recoveryBadge}
          </div>
          <div class="sp-caption-meta">
            <span>${escapeHtml(outcome.viewport.name)} (${outcome.viewport.width}×${outcome.viewport.height})</span>
            <span>·</span>
            <span>${formatDuration(outcome.durationMs)}</span>
          </div>
        </div>
      </div>`;
    })
    .join('\n');

  // Failure details section
  const failureDetailsHtml =
    failedScenarios.length > 0
      ? `
      <section class="sp-failures-section" aria-labelledby="failures-title">
        <h2 id="failures-title" class="sp-section-title">
          <span style="color:var(--sp-red)">Failure Details</span>
          <span style="font-size:13px;color:var(--sp-text-muted);font-weight:400">(${failedScenarios.length} failed / error)</span>
        </h2>
        ${failedScenarios
          .map((fail: ScenarioOutcome) => {
            return `
          <div class="sp-failure-card">
            <div class="sp-failure-header">
              <span class="sp-failure-title">[${escapeHtml(fail.id)}] ${escapeHtml(fail.viewport.name)} — ${escapeHtml(fail.failureCode ?? 'unknown')}</span>
              ${renderBadge(fail.status)}
            </div>
            ${fail.message ? `<pre class="sp-failure-msg">${escapeHtml(fail.message)}</pre>` : ''}
            ${fail.hint ? `<div class="sp-failure-hint"><strong>hint:</strong> ${escapeHtml(fail.hint)}</div>` : ''}
          </div>`;
          })
          .join('\n')}
      </section>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stateproof Report — ${escapeHtml(result.file)}</title>
  <style>
${INLINE_REPORT_STYLES}
  </style>
</head>
<body>
  <div class="sp-container">
    <header class="sp-header">
      <div class="sp-eyebrow">
        <span class="sp-eyebrow-badge"></span>
        STATEPROOF / RUNTIME VALIDATION REPORT
      </div>
      <div class="sp-title-row">
        <h1 class="sp-title">${escapeHtml(result.file)}</h1>
        <a href="${escapeHtml(result.baseUrl)}" class="sp-url" target="_blank" rel="noopener noreferrer">${escapeHtml(result.baseUrl)}</a>
      </div>
      <div class="sp-meta-strip">
        <div class="sp-meta-item">
          <span class="sp-meta-label">Run ID:</span>
          <span>${escapeHtml(result.runId)}</span>
        </div>
        <div class="sp-meta-item">
          <span class="sp-meta-label">Timestamp:</span>
          <time datetime="${escapeHtml(result.startedAt)}">${escapeHtml(result.startedAt)}</time>
        </div>
        <div class="sp-meta-item">
          <span class="sp-meta-label">Browser:</span>
          <span>Chromium ${escapeHtml(result.browserVersion)}</span>
        </div>
        <div class="sp-meta-item">
          <span class="sp-meta-label">Stateproof:</span>
          <span>v${escapeHtml(result.stateproofVersion)}</span>
        </div>
      </div>
    </header>

    <main>
      <!-- Summary Stats -->
      <section class="sp-stats-grid" aria-label="Summary Statistics">
        <div class="sp-stat-card">
          <div class="sp-stat-value sp-stat-pass">${passedCount}</div>
          <div class="sp-stat-label">Passed</div>
        </div>
        <div class="sp-stat-card">
          <div class="sp-stat-value ${failedCount > 0 ? 'sp-stat-fail' : 'sp-stat-neutral'}">${failedCount}</div>
          <div class="sp-stat-label">Failed</div>
        </div>
        <div class="sp-stat-card">
          <div class="sp-stat-value ${errorCount > 0 ? 'sp-stat-fail' : 'sp-stat-neutral'}">${errorCount}</div>
          <div class="sp-stat-label">Errors</div>
        </div>
        <div class="sp-stat-card">
          <div class="sp-stat-value sp-stat-neutral">${formatDuration(totalDuration)}</div>
          <div class="sp-stat-label">Total Duration</div>
        </div>
      </section>

      <!-- State Matrix -->
      <section aria-labelledby="matrix-title">
        <h2 id="matrix-title" class="sp-section-title">State Matrix</h2>
        <div class="sp-table-wrapper">
          <table class="sp-matrix-table">
            <thead>
              <tr>
                <th scope="col">Scenario</th>
                ${tableHeaders}
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Failure Details -->
      ${failureDetailsHtml}

      <!-- Screenshot Gallery -->
      <section aria-labelledby="gallery-title">
        <h2 id="gallery-title" class="sp-section-title">Screenshot Evidence</h2>
        <div class="sp-gallery-grid">
          ${galleryCards}
        </div>
      </section>

      <!-- Visual Diff Evidence -->
      ${
        scenarios.some((s: ScenarioOutcome) => s.visualDiff !== undefined)
          ? `
      <section class="sp-diff-section" aria-labelledby="diff-title">
        <h2 id="diff-title" class="sp-section-title">Visual Diff Evidence</h2>
        ${scenarios
          .filter((s: ScenarioOutcome) => s.visualDiff !== undefined)
          .map((s: ScenarioOutcome) => {
            const vd = s.visualDiff;
            if (!vd) return '';
            const diffPercent =
              vd.diffRatio !== undefined ? `${(vd.diffRatio * 100).toFixed(2)}%` : '—';
            const thresholdPercent =
              vd.threshold !== undefined ? `${(vd.threshold * 100).toFixed(2)}%` : '0.10%';
            return `
          <div class="sp-diff-card">
            <div class="sp-diff-header">
              <span class="sp-diff-title">[${escapeHtml(s.id)}] ${escapeHtml(s.viewport.name)}</span>
              ${renderBadge(s.status)}
            </div>
            <div class="sp-diff-metrics">
              <span><strong>Diff:</strong> ${escapeHtml(diffPercent)}</span>
              <span><strong>Threshold:</strong> ${escapeHtml(thresholdPercent)}</span>
            </div>
            <div class="sp-diff-grid">
              ${
                vd.baseline
                  ? `<div class="sp-diff-box">
                      <div class="sp-diff-box-title">Baseline</div>
                      <img src="assets/${escapeHtml(vd.baseline)}" alt="Baseline" loading="lazy" />
                    </div>`
                  : ''
              }
              ${
                vd.current
                  ? `<div class="sp-diff-box">
                      <div class="sp-diff-box-title">Current</div>
                      <img src="assets/${escapeHtml(vd.current)}" alt="Current" loading="lazy" />
                    </div>`
                  : ''
              }
              ${
                vd.diff
                  ? `<div class="sp-diff-box">
                      <div class="sp-diff-box-title">Diff</div>
                      <img src="assets/${escapeHtml(vd.diff)}" alt="Diff" loading="lazy" />
                    </div>`
                  : ''
              }
            </div>
          </div>`;
          })
          .join('\n')}
      </section>`
          : ''
      }
    </main>

    <footer class="sp-footer">
      <div>
        <strong>Stateproof ${escapeHtml(result.stateproofVersion)}</strong> · Chromium ${escapeHtml(result.browserVersion)} · Run ${escapeHtml(result.runId)}
      </div>
      <div>
        Generated at ${escapeHtml(result.finishedAt)}
      </div>
    </footer>
  </div>
</body>
</html>`;
}
