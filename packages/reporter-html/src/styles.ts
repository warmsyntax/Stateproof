/**
 * Signal Foundry Design System CSS tokens & component styling.
 * Inlined directly into report/index.html with zero external network requests.
 */
export const INLINE_REPORT_STYLES = `
:root {
  --sp-bg: #111214;
  --sp-surface-1: #17191C;
  --sp-surface-2: #1E2126;
  --sp-panel-light: #F4F3EE;
  --sp-border: rgba(255, 255, 255, 0.10);
  --sp-border-strong: rgba(255, 255, 255, 0.22);
  --sp-text: #ECEDEA;
  --sp-text-muted: #9BA1A6;
  --sp-text-faint: #6B7280;
  --sp-lime: #C8F04B;
  --sp-lime-ink: #1A2405;
  --sp-cobalt: #4D8DFF;
  --sp-red: #FF6B5E;
  --sp-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, system-ui, sans-serif;
  --sp-font-mono: "JetBrains Mono", ui-monospace, "Cascadia Code", Consolas, "SF Mono", monospace;
  --sp-radius-sm: 3px;
  --sp-radius-md: 6px;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background-color: var(--sp-bg);
  color: var(--sp-text);
  font-family: var(--sp-font-sans);
  font-size: 15px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  padding: 32px 24px 64px;
}

.sp-container {
  max-width: 1280px;
  margin: 0 auto;
}

/* Header */
.sp-header {
  border-bottom: 1px solid var(--sp-border);
  padding-bottom: 24px;
  margin-bottom: 32px;
}

.sp-eyebrow {
  font-family: var(--sp-font-mono);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--sp-text-faint);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sp-eyebrow-badge {
  display: inline-block;
  width: 8px;
  height: 8px;
  background-color: var(--sp-lime);
  border-radius: 1px;
}

.sp-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
}

.sp-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--sp-text);
}

.sp-url {
  font-family: var(--sp-font-mono);
  font-size: 14px;
  color: var(--sp-cobalt);
  text-decoration: none;
}

.sp-meta-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 16px;
  font-family: var(--sp-font-mono);
  font-size: 13px;
  color: var(--sp-text-muted);
}

.sp-meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sp-meta-label {
  color: var(--sp-text-faint);
}

/* Stats Summary */
.sp-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.sp-stat-card {
  background: var(--sp-surface-1);
  border: 1px solid var(--sp-border);
  border-radius: var(--sp-radius-md);
  padding: 16px 20px;
}

.sp-stat-value {
  font-size: 28px;
  font-weight: 700;
  font-family: var(--sp-font-mono);
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.sp-stat-label {
  font-size: 13px;
  color: var(--sp-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 4px;
}

.sp-stat-pass { color: var(--sp-lime); }
.sp-stat-fail { color: var(--sp-red); }
.sp-stat-neutral { color: var(--sp-text); }

/* Section Titles */
.sp-section-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 32px 0 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* State Matrix Table */
.sp-table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--sp-border);
  border-radius: var(--sp-radius-md);
  background: var(--sp-surface-1);
  margin-bottom: 32px;
}

.sp-matrix-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 14px;
}

.sp-matrix-table th,
.sp-matrix-table td {
  padding: 14px 18px;
  border-bottom: 1px solid var(--sp-border);
}

.sp-matrix-table th {
  background: var(--sp-surface-2);
  font-family: var(--sp-font-mono);
  font-weight: 600;
  font-size: 13px;
  color: var(--sp-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sp-matrix-table tbody tr:last-child td {
  border-bottom: none;
}

.sp-matrix-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.02);
}

.sp-scenario-cell {
  font-weight: 600;
}

.sp-scenario-id {
  font-family: var(--sp-font-mono);
  font-size: 13px;
  color: var(--sp-text);
}

.sp-scenario-note {
  font-size: 12px;
  color: var(--sp-text-muted);
  margin-top: 2px;
  font-weight: 400;
}

/* Status Badges */
.sp-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--sp-radius-sm);
  font-family: var(--sp-font-mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.sp-badge-pass {
  background: rgba(200, 240, 75, 0.12);
  color: var(--sp-lime);
  border: 1px solid rgba(200, 240, 75, 0.35);
}

.sp-badge-fail {
  background: rgba(255, 107, 94, 0.12);
  color: var(--sp-red);
  border: 1px solid rgba(255, 107, 94, 0.35);
}

.sp-badge-error {
  background: rgba(255, 107, 94, 0.18);
  color: var(--sp-red);
  border: 1px solid var(--sp-red);
}

/* Failure Details Block */
.sp-failures-section {
  margin-bottom: 32px;
}

.sp-failure-card {
  background: var(--sp-surface-1);
  border: 1px solid rgba(255, 107, 94, 0.4);
  border-radius: var(--sp-radius-md);
  padding: 20px;
  margin-bottom: 16px;
}

.sp-failure-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.sp-failure-title {
  font-family: var(--sp-font-mono);
  font-size: 15px;
  font-weight: 700;
  color: var(--sp-red);
}

.sp-failure-msg {
  font-family: var(--sp-font-mono);
  font-size: 13px;
  color: var(--sp-text);
  background: var(--sp-surface-2);
  padding: 10px 14px;
  border-radius: var(--sp-radius-sm);
  margin-bottom: 10px;
  white-space: pre-wrap;
  word-break: break-word;
}

.sp-failure-hint {
  font-size: 13px;
  color: var(--sp-text-muted);
}

.sp-failure-hint strong {
  color: var(--sp-cobalt);
}

/* Gallery Grid */
.sp-gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 24px;
  margin-bottom: 48px;
}

.sp-screenshot-card {
  background: var(--sp-surface-1);
  border: 1px solid var(--sp-border);
  border-radius: var(--sp-radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sp-screenshot-card:focus-within {
  outline: 2px solid var(--sp-border-strong);
}

.sp-screenshot-frame {
  background: var(--sp-panel-light);
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
}

.sp-screenshot-img {
  max-width: 100%;
  height: auto;
  border-radius: var(--sp-radius-sm);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: block;
}

.sp-screenshot-caption {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid var(--sp-border);
}

.sp-caption-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sp-caption-id {
  font-family: var(--sp-font-mono);
  font-size: 14px;
  font-weight: 700;
  color: var(--sp-text);
}

.sp-caption-meta {
  font-family: var(--sp-font-mono);
  font-size: 12px;
  color: var(--sp-text-muted);
  display: flex;
  gap: 12px;
}

/* Footer */
.sp-footer {
  border-top: 1px solid var(--sp-border);
  padding-top: 24px;
  margin-top: 48px;
  font-family: var(--sp-font-mono);
  font-size: 12px;
  color: var(--sp-text-faint);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

/* Visual Diff Evidence */
.sp-diff-section {
  margin-top: 48px;
}

.sp-diff-card {
  background: var(--sp-surface-1);
  border: 1px solid var(--sp-border);
  border-radius: var(--sp-radius-md);
  padding: 20px;
  margin-bottom: 24px;
}

.sp-diff-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.sp-diff-title {
  font-family: var(--sp-font-mono);
  font-size: 15px;
  font-weight: 700;
  color: var(--sp-text);
}

.sp-diff-metrics {
  font-family: var(--sp-font-mono);
  font-size: 12px;
  color: var(--sp-text-muted);
  margin-bottom: 16px;
  display: flex;
  gap: 16px;
}

.sp-diff-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.sp-diff-box {
  background: var(--sp-surface-2);
  border: 1px solid var(--sp-border);
  border-radius: var(--sp-radius-sm);
  overflow: hidden;
}

.sp-diff-box-title {
  padding: 8px 12px;
  font-family: var(--sp-font-mono);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--sp-text-muted);
  border-bottom: 1px solid var(--sp-border);
}

.sp-diff-box img {
  width: 100%;
  height: auto;
  display: block;
}

/* Print Styles */
@media print {
  body {
    background: #FFFFFF;
    color: #000000;
    padding: 0;
  }
  .sp-container {
    max-width: 100%;
  }
  .sp-stat-card,
  .sp-table-wrapper,
  .sp-screenshot-card,
  .sp-failure-card,
  .sp-diff-card {
    border: 1px solid #CCCCCC;
    background: #FFFFFF;
    color: #000000;
  }
  .sp-screenshot-frame,
  .sp-diff-box {
    background: #F0F0F0;
  }
}
`;
