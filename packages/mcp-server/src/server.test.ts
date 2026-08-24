import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { afterEach, describe, expect, it } from 'vitest';
import { createStateproofMcpServer } from './server.js';

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'stateproof-mcp-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

const sampleScenarioFile = {
  $schema: 'https://stateproof.dev/schema/v1.json',
  name: 'account-settings',
  baseUrl: 'http://localhost:5173',
  route: '/account',
  viewports: [{ name: 'desktop', width: 1440, height: 1024 }],
  scenarios: [
    {
      id: 'account-loading',
      label: 'Loading State',
      request: { method: 'GET', urlPattern: '**/api/account' },
      response: { mode: 'delay', milliseconds: 500 },
      expect: { visible: '[data-state="loading"]' },
    },
  ],
};

describe('@stateproof/mcp-server', () => {
  it('exposes stateproof tools in list_tools schema', async () => {
    const server = createStateproofMcpServer();
    // Directly test the registered list tools handler
    const handler = (server as any)._requestHandlers.get(ListToolsRequestSchema.shape.method.value);
    expect(handler).toBeDefined();

    const response = await handler({ method: 'tools/list' }, {});
    const toolNames = response.tools.map((t: any) => t.name);

    expect(toolNames).toContain('stateproof_list_scenarios');
    expect(toolNames).toContain('stateproof_run_validation');
    expect(toolNames).toContain('stateproof_inspect_failure');
  });

  it('handles stateproof_list_scenarios tool call', async () => {
    const dir = makeTempDir();
    const filePath = join(dir, 'stateproof.scenarios.json');
    writeFileSync(filePath, JSON.stringify(sampleScenarioFile, null, 2), 'utf-8');

    const server = createStateproofMcpServer();
    const handler = (server as any)._requestHandlers.get(CallToolRequestSchema.shape.method.value);
    expect(handler).toBeDefined();

    const response = await handler(
      {
        method: 'tools/call',
        params: {
          name: 'stateproof_list_scenarios',
          arguments: {
            file: filePath,
            projectRoot: dir,
          },
        },
      },
      {},
    );

    expect(response.isError).toBeFalsy();
    expect(response.content).toHaveLength(1);
    const parsedEnvelope = JSON.parse(response.content[0].text);
    expect(parsedEnvelope.ok).toBe(true);
    expect(parsedEnvelope.type).toBe('list.result');
    expect(parsedEnvelope.data.name).toBe('account-settings');
  });

  it('handles stateproof_inspect_failure tool call', async () => {
    const dir = makeTempDir();
    const artifactDir = join(dir, 'artifacts', 'stateproof', 'account-settings');
    mkdirSync(artifactDir, { recursive: true });

    const runJsonContent = {
      schemaVersion: 1,
      runId: 'mcp-run-999',
      stateproofVersion: '0.1.0',
      browserVersion: '141',
      startedAt: '2026-08-24T10:00:00Z',
      finishedAt: '2026-08-24T10:00:05Z',
      baseUrl: 'http://localhost:5173',
      file: 'stateproof.scenarios.json',
      scenarios: [
        {
          id: 'account-loading',
          label: 'Loading State',
          viewport: { name: 'desktop', width: 1440, height: 1024 },
          status: 'failed',
          failureCode: 'selector-timeout',
          message: 'selector timed out',
          hint: 'check spinner',
          artifacts: {},
          durationMs: 3000,
        },
      ],
    };
    writeFileSync(join(artifactDir, 'run.json'), JSON.stringify(runJsonContent, null, 2), 'utf-8');

    const server = createStateproofMcpServer();
    const handler = (server as any)._requestHandlers.get(CallToolRequestSchema.shape.method.value);

    const response = await handler(
      {
        method: 'tools/call',
        params: {
          name: 'stateproof_inspect_failure',
          arguments: {
            run: artifactDir,
            projectRoot: dir,
          },
        },
      },
      {},
    );

    expect(response.isError).toBeFalsy();
    const parsedEnvelope = JSON.parse(response.content[0].text);
    expect(parsedEnvelope.type).toBe('inspect.result');
    expect(parsedEnvelope.data.runId).toBe('mcp-run-999');
    expect(parsedEnvelope.data.failureCode).toBe('selector-timeout');
  });

  it('returns structured error on unknown tool call', async () => {
    const server = createStateproofMcpServer();
    const handler = (server as any)._requestHandlers.get(CallToolRequestSchema.shape.method.value);

    const response = await handler(
      {
        method: 'tools/call',
        params: {
          name: 'unknown_tool',
          arguments: {},
        },
      },
      {},
    );

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain('Unknown tool name');
  });
});
