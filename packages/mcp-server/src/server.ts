import { resolve } from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { executeList, executeRun, inspectFailure } from '@stateproof-dev/app';
import { StateproofError } from '@stateproof-dev/core';

export interface CreateMcpServerOptions {
  name?: string | undefined;
  version?: string | undefined;
}

export function createStateproofMcpServer(options: CreateMcpServerOptions = {}): Server {
  const server = new Server(
    {
      name: options.name ?? 'stateproof',
      version: options.version ?? '0.1.3',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'stateproof_list_scenarios',
          description:
            'Inspect and list all defined scenario files, routes, mock rules, and configured viewports in the project.',
          inputSchema: {
            type: 'object',
            properties: {
              file: {
                type: 'string',
                description: 'Path to scenario file (default: stateproof.scenarios.json)',
              },
              projectRoot: {
                type: 'string',
                description: 'Optional root project directory to resolve files from',
              },
            },
          },
        },
        {
          name: 'stateproof_run_validation',
          description:
            'Execute deterministic frontend state machine validation against the target application.',
          inputSchema: {
            type: 'object',
            properties: {
              file: {
                type: 'string',
                description: 'Scenario file path (default: stateproof.scenarios.json)',
              },
              scenario: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific scenario IDs to run',
              },
              viewport: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific viewport names to run',
              },
              url: {
                type: 'string',
                description: 'Override target application baseUrl',
              },
              browserChannel: {
                type: 'string',
                description: 'Browser channel to launch (e.g. "chrome", "msedge", "chromium")',
              },
              cdpUrl: {
                type: 'string',
                description: 'Remote browser CDP WebSocket endpoint (e.g. "ws://localhost:9222")',
              },
              timeoutMs: {
                type: 'number',
                description: 'Override per-scenario timeout in milliseconds',
              },
              diff: {
                type: 'boolean',
                description: 'Enable visual diff comparison against baselines',
              },
              updateBaselines: {
                type: 'boolean',
                description: 'Save current captures as new visual baselines',
              },
              diffThreshold: {
                type: 'number',
                description: 'Maximum allowed diff pixel ratio (default: 0.001)',
              },
              allowRemote: {
                type: 'boolean',
                description: 'Permit execution against non-loopback URLs',
              },
              allowThirdParty: {
                type: 'boolean',
                description: 'Permit third-party network requests',
              },
              strictSecrets: {
                type: 'boolean',
                description: 'Treat secret detection warnings as fatal errors',
              },
              projectRoot: {
                type: 'string',
                description: 'Optional root project directory',
              },
            },
          },
        },
        {
          name: 'stateproof_inspect_failure',
          description:
            'Deeply inspect a failing scenario outcome to extract specific failure codes, error messages, actionable hints, selector suggestions, visual diff evidence, and artifact paths.',
          inputSchema: {
            type: 'object',
            properties: {
              run: {
                type: 'string',
                description: 'Artifact directory path or scenario run name to inspect',
              },
              scenario: {
                type: 'string',
                description: 'Specific scenario ID to inspect',
              },
              viewport: {
                type: 'string',
                description: 'Specific viewport name to inspect',
              },
              projectRoot: {
                type: 'string',
                description: 'Optional root project directory',
              },
            },
            required: ['run'],
          },
        },
      ],
    };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    const projectRoot =
      typeof args.projectRoot === 'string' ? resolve(args.projectRoot) : process.cwd();

    try {
      if (name === 'stateproof_list_scenarios') {
        const fileCandidate =
          typeof args.file === 'string' ? args.file : 'stateproof.scenarios.json';
        const filePath = resolve(projectRoot, fileCandidate);

        const listResult = await executeList({ file: filePath });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(listResult.envelope, null, 2),
            },
          ],
        };
      }

      if (name === 'stateproof_run_validation') {
        const fileCandidate =
          typeof args.file === 'string' ? args.file : 'stateproof.scenarios.json';
        const filePath = resolve(projectRoot, fileCandidate);

        const runResult = await executeRun({
          file: filePath,
          scenario: Array.isArray(args.scenario) ? (args.scenario as string[]) : undefined,
          viewport: Array.isArray(args.viewport) ? (args.viewport as string[]) : undefined,
          url: typeof args.url === 'string' ? args.url : undefined,
          browserChannel: typeof args.browserChannel === 'string' ? args.browserChannel : undefined,
          cdpUrl: typeof args.cdpUrl === 'string' ? args.cdpUrl : undefined,
          timeoutMs: typeof args.timeoutMs === 'number' ? args.timeoutMs : undefined,
          diff: Boolean(args.diff),
          updateBaselines: Boolean(args.updateBaselines),
          diffThreshold: typeof args.diffThreshold === 'number' ? args.diffThreshold : undefined,
          allowRemote: Boolean(args.allowRemote),
          allowThirdParty: Boolean(args.allowThirdParty),
          strictSecrets: Boolean(args.strictSecrets),
          artifactsRoot: resolve(projectRoot, 'artifacts', 'stateproof'),
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(runResult.envelope, null, 2),
            },
          ],
        };
      }

      if (name === 'stateproof_inspect_failure') {
        if (typeof args.run !== 'string' || !args.run) {
          throw new StateproofError({
            code: 'EXPORT_RUN_MISSING',
            message: 'Parameter "run" is required to inspect scenario failure.',
            hint: 'Specify the artifact directory or run name.',
          });
        }

        const inspectResult = await inspectFailure({
          run: typeof args.run === 'string' ? resolve(projectRoot, args.run) : args.run,
          scenario: typeof args.scenario === 'string' ? args.scenario : undefined,
          viewport: typeof args.viewport === 'string' ? args.viewport : undefined,
          artifactsRoot: resolve(projectRoot, 'artifacts', 'stateproof'),
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(inspectResult.envelope, null, 2),
            },
          ],
        };
      }

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Unknown tool name: ${name}`,
          },
        ],
      };
    } catch (error) {
      const err =
        error instanceof StateproofError
          ? {
              code: error.code,
              message: error.message,
              hint: error.hint,
              file: error.file,
            }
          : {
              code: 'INTERNAL_ERROR',
              message: error instanceof Error ? error.message : String(error),
              hint: 'Check server logs.',
            };

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ok: false,
                type: 'error',
                data: null,
                error: err,
                exitCode: 2,
              },
              null,
              2,
            ),
          },
        ],
      };
    }
  });

  return server;
}
