#!/usr/bin/env node
import { exitCodeFor, StateproofError } from '@stateproof-dev/core';
import { Command } from 'commander';
import pc from 'picocolors';
import { runExport } from './commands/export.js';
import { runInit } from './commands/init.js';
import { runList } from './commands/list.js';
import { runRun } from './commands/run.js';
import { runStudio } from './commands/studio.js';
import { emitJsonEnvelope } from './reporters/json.js';

const VERSION = '0.1.3';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('stateproof')
    .description('Stateproof frontend runtime validation CLI')
    .version(VERSION, '-v, --version');

  program
    .command('init')
    .description('Scaffold a new scenario file, fixtures directory, and gitignore entry')
    .option('--file <path>', 'Scenario file path')
    .option('--url <baseUrl>', 'Base application URL')
    .option('--route <routePath>', 'Default route path')
    .option('--force', 'Overwrite existing scenario file')
    .option('--reporter <type>', 'Output format (human|json)', 'human')
    .action(async (options) => {
      const exitCode = await runInit(options);
      process.exit(exitCode);
    });

  program
    .command('list')
    .description('Validate scenario file and display summary')
    .option('--file <path>', 'Scenario file path')
    .option('--reporter <type>', 'Output format (human|json)', 'human')
    .action(async (options) => {
      const exitCode = await runList(options);
      process.exit(exitCode);
    });

  program.option('--tui', 'Launch interactive terminal studio (TUI)').action(async (options) => {
    if (options.tui) {
      const exitCode = await runStudio(options);
      process.exit(exitCode);
    }
    program.help();
  });

  program
    .command('run')
    .description('Execute scenarios in controlled headless browser')
    .argument('[positionals...]', 'Scenario IDs or scenario file name to execute')
    .option('--file <path>', 'Scenario file path')
    .option('--scenario <ids...>', 'Specific scenario IDs to run')
    .option('--viewport <names...>', 'Specific viewport names to run')
    .option('--url <baseUrl>', 'Override baseUrl')
    .option('--timeout-ms <number>', 'Override per-scenario timeout', (v) => parseInt(v, 10))
    .option(
      '--browser-channel <name>',
      'Browser channel (chrome, msedge, chromium)',
      process.env.STATEPROOF_BROWSER_CHANNEL,
    )
    .option(
      '--cdp-url <url>',
      'Remote browser CDP WebSocket endpoint',
      process.env.STATEPROOF_CDP_URL,
    )
    .option('--allow-remote', 'Permit execution against non-loopback URLs')
    .option('--allow-third-party', 'Permit third-party network requests')
    .option('--strict-secrets', 'Treat secret detection warnings as fatal errors')
    .option('--diff', 'Enable visual diffing against baselines')
    .option('--update-baselines', 'Update visual baselines with current captures')
    .option(
      '--baseline-dir <path>',
      'Directory storing visual baselines (default: stateproof/baselines)',
    )
    .option('--diff-threshold <number>', 'Maximum allowed diff pixel ratio (default: 0.001)', (v) =>
      parseFloat(v),
    )
    .option('--fail-fast', 'Stop execution on the first scenario failure')
    .option(
      '--failure-budget-ms <number>',
      'Override timeout for failing checks in milliseconds',
      (v) => parseInt(v, 10),
    )
    .option('--reporter <type>', 'Output format (human|json)', 'human')
    .option('--tui', 'Launch interactive terminal studio (TUI)')
    .action(async (positionals, options) => {
      if (options.tui) {
        const exitCode = await runStudio({ ...options });
        process.exit(exitCode);
      }
      const exitCode = await runRun({ ...options, positionals });
      process.exit(exitCode);
    });

  program
    .command('studio')
    .alias('tui')
    .description('Launch interactive terminal studio (TUI) for exploratory validation')
    .option('--file <path>', 'Scenario file path')
    .option('--url <baseUrl>', 'Override baseUrl')
    .option('--allow-remote', 'Permit execution against non-loopback URLs')
    .option('--allow-third-party', 'Permit third-party network requests')
    .option('--strict-secrets', 'Treat secret detection warnings as fatal errors')
    .option('--headed', 'Run browser in headed mode')
    .option(
      '--baseline-dir <path>',
      'Directory storing visual baselines (default: stateproof/baselines)',
    )
    .option('--diff-threshold <number>', 'Maximum allowed diff pixel ratio (default: 0.001)', (v) =>
      parseFloat(v),
    )
    .action(async (options) => {
      const exitCode = await runStudio(options);
      process.exit(exitCode);
    });

  program
    .command('export')
    .description('Emit Stateproof Card from an artifact directory')
    .option('--run <artifactDir>', 'Target artifact directory')
    .option('--file <scenarioFilePath>', 'Target scenario file path')
    .option('--format <type>', 'Card output format (md|json)', 'md')
    .action(async (options) => {
      const exitCode = await runExport(options);
      process.exit(exitCode);
    });

  return program;
}

export async function main(argv: string[] = process.argv): Promise<void> {
  const isJson =
    (argv.includes('--reporter') && argv[argv.indexOf('--reporter') + 1] === 'json') ||
    argv.some((a) => a.startsWith('--reporter=json')) ||
    (argv.includes('export') &&
      (argv.includes('--format=json') ||
        (argv.includes('--format') && argv[argv.indexOf('--format') + 1] === 'json')));

  try {
    const program = createProgram();
    program.exitOverride();
    await program.parseAsync(argv);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'exitCode' in error &&
      typeof (error as { exitCode: number }).exitCode === 'number'
    ) {
      const code = (error as { exitCode: number }).exitCode;
      if (code === 0) process.exit(0);
    }

    if (error instanceof StateproofError) {
      const exitCode = exitCodeFor(error.code);
      if (isJson) {
        emitJsonEnvelope({
          type: 'error',
          data: null,
          error: {
            code: error.code,
            message: error.message,
            hint: error.hint,
            ...(error.file !== undefined ? { file: error.file } : {}),
            runId: error.runId ?? null,
          },
          exitCode,
        });
      } else {
        process.stderr.write(
          `${pc.red(pc.bold(`Error [${error.code}]`))}: ${error.message}\n` +
            `  ${pc.cyan('hint:')} ${error.hint}\n`,
        );
      }
      process.exit(exitCode);
    }

    const message = error instanceof Error ? error.message : String(error);
    if (isJson) {
      emitJsonEnvelope({
        type: 'error',
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message,
          hint: 'Inspect the stack trace or report this issue.',
          runId: null,
        },
        exitCode: 4,
      });
    } else {
      process.stderr.write(`${pc.red(pc.bold('Unexpected Error'))}: ${message}\n`);
    }
    process.exit(4);
  }
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('main.js') ||
  process.argv[1]?.endsWith('stateproof')
) {
  void main();
}
