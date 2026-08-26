import { matchesRequest, type RequestRule, type ResponseRule } from '@stateproof-dev/core';
import type { Page, Route } from 'playwright';
import { classifyRequest, contentTypeForFixturePath } from './classify.js';

export interface InterceptorOptions {
  baseUrlOrigin: string;
  rule: RequestRule;
  response: ResponseRule;
  fixtureBytes?: Uint8Array | undefined;
  allowThirdParty: boolean;
}

export interface InterceptorHandle {
  interceptedOnce: () => boolean;
  interceptedAtMs: () => number | null;
  handlerFailures: () => string[];
  pendingDelayRoute: () => boolean;
  laterMatchesAborted: () => number;
  finalizeDelay: () => Promise<void>;
  updateRule: (
    rule: RequestRule,
    response: ResponseRule,
    fixtureBytes?: Uint8Array | undefined,
  ) => void;
}

const decoder = new TextDecoder();

async function passThrough(route: Route): Promise<void> {
  try {
    await route.continue();
  } catch {
    // Route may already be settled if context was closed.
  }
}

function headerWith(response: ResponseRule, name: string): string | undefined {
  if (
    (response.mode === 'fixture' || response.mode === 'inline' || response.mode === 'error') &&
    response.headers !== undefined &&
    response.headers[name] !== undefined
  ) {
    return response.headers[name];
  }
  return undefined;
}

async function applyScenarioRule(
  route: Route,
  response: ResponseRule,
  fixtureBytes?: Uint8Array,
): Promise<void> {
  switch (response.mode) {
    case 'offline':
      await route.abort('internetdisconnected');
      return;
    case 'error': {
      const hasBody = response.body !== undefined;
      const options: Parameters<Route['fulfill']>[0] = { status: response.status };
      if (hasBody) {
        options.body = JSON.stringify(response.body);
        const override = headerWith(response, 'Content-Type');
        options.contentType = override ?? 'application/json';
      }
      if (response.headers !== undefined) options.headers = { ...response.headers };
      await route.fulfill(options);
      return;
    }
    case 'inline': {
      const options: Parameters<Route['fulfill']>[0] = {
        status: response.status ?? 200,
        body: JSON.stringify(response.body),
        contentType: headerWith(response, 'Content-Type') ?? 'application/json',
      };
      if (response.headers !== undefined) options.headers = { ...response.headers };
      await route.fulfill(options);
      return;
    }
    case 'fixture': {
      const bytes = fixtureBytes ?? new Uint8Array();
      const options: Parameters<Route['fulfill']>[0] = {
        status: response.status ?? 200,
        body: Buffer.from(bytes),
        contentType:
          headerWith(response, 'Content-Type') ?? contentTypeForFixturePath(response.path),
      };
      if (response.headers !== undefined) options.headers = { ...response.headers };
      await route.fulfill(options);
      return;
    }
    case 'delay':
      // Handled by the caller: the first match must stay unresolved.
      throw new Error('delay mode must not be fulfilled by applyScenarioRule');
  }
}

// One catch-all handler per page (contract §6.3). Every code path resolves the
// route exactly once; the only intentionally unresolved route is a held `delay`.
export function installInterceptor(page: Page, options: InterceptorOptions): InterceptorHandle {
  let currentRule = options.rule;
  let currentResponse = options.response;
  let currentFixtureBytes = options.fixtureBytes;

  let firstMatchHeld = false;
  let interceptedAtMs: number | null = null;
  let pendingRoute: Route | null = null;
  let laterMatchesAborted = 0;
  const handlerFailures: string[] = [];

  const handle = async (route: Route): Promise<void> => {
    const url = route.request().url();
    try {
      const classification = classifyRequest(url, options.baseUrlOrigin, options.allowThirdParty);
      if (!classification || classification.disposition === 'data-blob-passthrough') {
        await route.continue().catch(() => undefined);
        return;
      }
      if (classification.disposition === 'third-party-block') {
        await route.abort('blockedbyclient');
        return;
      }
      if (
        classification.disposition === 'third-party-fetch' ||
        !matchesRequest(currentRule, route.request().method(), url)
      ) {
        await passThrough(route);
        return;
      }

      // Matched the scenario rule.
      if (currentResponse.mode === 'delay') {
        if (!firstMatchHeld) {
          firstMatchHeld = true;
          interceptedAtMs = Date.now();
          pendingRoute = route;
          return;
        }
        laterMatchesAborted += 1;
        await route.abort('aborted');
        return;
      }
      interceptedAtMs = Date.now();
      await applyScenarioRule(route, currentResponse, currentFixtureBytes);
    } catch (error) {
      handlerFailures.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
      try {
        await route.abort('failed');
      } catch {
        // Route already settled by Playwright; nothing further to do.
      }
    }
  };

  void page.route('**/*', handle).catch(() => {});

  return {
    interceptedOnce: () => interceptedAtMs !== null,
    interceptedAtMs: () => interceptedAtMs,
    handlerFailures: () => [...handlerFailures],
    pendingDelayRoute: () => pendingRoute !== null,
    laterMatchesAborted: () => laterMatchesAborted,
    updateRule: (newRule: RequestRule, newResponse: ResponseRule, newFixtureBytes?: Uint8Array) => {
      currentRule = newRule;
      currentResponse = newResponse;
      currentFixtureBytes = newFixtureBytes;
    },
    finalizeDelay: async (): Promise<void> => {
      const route = pendingRoute;
      pendingRoute = null;
      if (route) {
        try {
          await route.abort('aborted');
        } catch {
          // Context may already be closing.
        }
      }
    },
  };
}

export interface WebSocketInterceptorHandle {
  socketIntercepted: () => boolean;
}

export async function installWebSocketInterceptor(
  page: Page,
  wsRule: { urlPattern: string; mode: 'drop-connection' | 'close'; afterMs?: number | undefined },
): Promise<WebSocketInterceptorHandle> {
  let socketIntercepted = false;
  try {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.enable').catch(() => undefined);

    cdp.on('Network.webSocketCreated', async (event: { url: string; requestId: string }) => {
      if (
        event.url.includes(wsRule.urlPattern.replace(/\*/g, '')) ||
        wsRule.urlPattern.includes('*')
      ) {
        socketIntercepted = true;
        const delay = wsRule.afterMs ?? 0;
        if (delay > 0) {
          await new Promise((r) => setTimeout(r, delay));
        }
        await cdp
          .send('Network.setBlockedURLs', { urls: [wsRule.urlPattern, event.url] })
          .catch(() => undefined);
      }
    });
  } catch {
    // Non-CDP browsers or CDP attach fail fallback
  }

  page.on('websocket', (ws) => {
    if (ws.url().includes(wsRule.urlPattern.replace(/\*/g, ''))) {
      socketIntercepted = true;
      const delay = wsRule.afterMs ?? 0;
      setTimeout(() => {
        // Socket matched
      }, delay);
    }
  });

  return {
    socketIntercepted: () => socketIntercepted,
  };
}

export function decodeFixture(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}
