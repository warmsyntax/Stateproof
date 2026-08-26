import { promises as dns } from 'node:dns';
import { isIP } from 'node:net';
import { StateproofError } from '@stateproof-dev/core';

export const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', '[::1]', 'localhost']);

export function isLoopbackIp(ip: string): boolean {
  if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true;
  if (ip.startsWith('127.')) return true;
  return false;
}

export async function verifyLoopback(
  baseUrl: string,
  allowRemote: boolean,
  stderr: (msg: string) => void = (msg) => process.stderr.write(`${msg}\n`),
): Promise<void> {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new StateproofError({
      code: 'NON_LOOPBACK_URL',
      message: `Invalid baseUrl: "${baseUrl}"`,
      hint: 'Provide a valid URL starting with http:// or https://',
    });
  }

  const rawHost = url.hostname;
  const cleanHost = rawHost.replace(/^\[|\]$/g, '');

  if (LOOPBACK_HOSTS.has(cleanHost) || isLoopbackIp(cleanHost)) {
    return;
  }

  if (cleanHost === '0.0.0.0') {
    if (!allowRemote) {
      throw new StateproofError({
        code: 'NON_LOOPBACK_URL',
        message: `0.0.0.0 is not a loopback address (${baseUrl}).`,
        hint: 'Use localhost or 127.0.0.1, or pass --allow-remote if intentional.',
      });
    }
    stderr(`warning: baseUrl "${baseUrl}" uses non-loopback host 0.0.0.0 with --allow-remote`);
    return;
  }

  if (isIP(cleanHost)) {
    if (!allowRemote) {
      throw new StateproofError({
        code: 'NON_LOOPBACK_URL',
        message: `Target baseUrl "${baseUrl}" is not a loopback address.`,
        hint: 'Pass --allow-remote to permit testing against remote or external hosts.',
      });
    }
    stderr(
      `warning: baseUrl "${baseUrl}" is non-loopback; proceeding because --allow-remote is enabled`,
    );
    return;
  }

  try {
    const addresses = await dns.lookup(cleanHost, { all: true });
    if (addresses.length === 0) {
      if (!allowRemote) {
        throw new StateproofError({
          code: 'NON_LOOPBACK_URL',
          message: `Host "${cleanHost}" could not be resolved to any loopback address.`,
          hint: 'Verify the host is running locally or pass --allow-remote.',
        });
      }
      return;
    }

    const allLoopback = addresses.every((addr) => isLoopbackIp(addr.address));
    if (!allLoopback) {
      if (!allowRemote) {
        throw new StateproofError({
          code: 'NON_LOOPBACK_URL',
          message: `Host "${cleanHost}" resolved to non-loopback address (${addresses.map((a) => a.address).join(', ')}).`,
          hint: 'Target localhost or pass --allow-remote to permit testing against remote targets.',
        });
      }
      stderr(`warning: host "${cleanHost}" resolved to non-loopback IP with --allow-remote`);
    }
  } catch (error) {
    if (error instanceof StateproofError) throw error;
    if (!allowRemote) {
      throw new StateproofError({
        code: 'NON_LOOPBACK_URL',
        message: `DNS resolution failed for host "${cleanHost}": ${error instanceof Error ? error.message : String(error)}`,
        hint: 'Verify the hostname or pass --allow-remote.',
      });
    }
  }
}

export async function checkAppReachability(
  baseUrl: string,
  timeoutMs: number = 10000,
  pollIntervalMs: number = 250,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: Error | null = null;

  while (Date.now() < deadline) {
    try {
      const controller = new AbortController();
      const signalTimeout = setTimeout(() => controller.abort(), 2000);
      try {
        await fetch(baseUrl, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(signalTimeout);
        return;
      } catch (err) {
        clearTimeout(signalTimeout);
        throw err;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      await new Promise((r) => setTimeout(r, Math.min(pollIntervalMs, remaining)));
    }
  }

  throw new StateproofError({
    code: 'APP_UNREACHABLE',
    message: `App unreachable at ${baseUrl} after ${Math.round(timeoutMs / 1000)}s${lastError ? ` (${lastError.message})` : ''}.`,
    hint: 'Start your application (e.g. npm run dev) or pass --url with the running address.',
  });
}
