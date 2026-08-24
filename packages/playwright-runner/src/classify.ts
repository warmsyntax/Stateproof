export type RequestDisposition =
  | 'data-blob-passthrough'
  | 'third-party-block'
  | 'third-party-fetch'
  | 'scenario-rule'
  | 'same-origin-passthrough';

export interface Classification {
  disposition: RequestDisposition;
  origin: string;
}

// Contract §6.3: data:/blob: pass; third-party aborts unless allowed; matched
// requests take the scenario rule; everything else same-origin passes through.
export function classifyRequest(
  requestUrl: string,
  baseUrlOrigin: string,
  allowThirdParty: boolean,
): Classification | null {
  const scheme = requestUrl.slice(0, requestUrl.indexOf(':')).toLowerCase();
  if (scheme === 'data' || scheme === 'blob') {
    return { disposition: 'data-blob-passthrough', origin: `${scheme}:` };
  }
  let parsed: URL;
  try {
    parsed = new URL(requestUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { disposition: 'data-blob-passthrough', origin: parsed.protocol };
  }
  if (parsed.origin !== baseUrlOrigin) {
    return {
      disposition: allowThirdParty ? 'third-party-fetch' : 'third-party-block',
      origin: parsed.origin,
    };
  }
  return { disposition: 'same-origin-passthrough', origin: parsed.origin };
}

const FIXTURE_CONTENT_TYPES: Record<string, string> = {
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.html': 'text/html',
};

export function contentTypeForFixturePath(path: string): string {
  const dot = path.lastIndexOf('.');
  const ext = dot === -1 ? '' : path.slice(dot).toLowerCase();
  return FIXTURE_CONTENT_TYPES[ext] ?? 'application/octet-stream';
}
