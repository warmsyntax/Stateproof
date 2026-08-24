/**
 * Rigorous HTML character escaping to prevent XSS / injection attacks
 * across all dynamic data emitted in HTML reports.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
