#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createStateproofMcpServer } from './server.js';

async function main(): Promise<void> {
  const server = createStateproofMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(`Fatal MCP Server Error: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
