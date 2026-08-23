import picomatch from 'picomatch';
import type { RequestRule } from './types.js';

export type PathnameMatcher = (pathname: string) => boolean;

export function compileMatcher(pattern: string): PathnameMatcher {
  const match = picomatch(pattern, { dot: true });
  return (pathname: string) => match(pathname);
}

export function matchesRequest(rule: RequestRule, method: string, url: string): boolean {
  if (rule.method !== method.toUpperCase()) return false;
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return false;
  }
  return compileMatcher(rule.urlPattern)(pathname);
}
