import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { StateproofError } from '@stateproof/core';
import pc from 'picocolors';
import { emitJsonEnvelope } from '../reporters/json.js';

export interface InitCommandOptions {
  file?: string;
  url?: string;
  route?: string;
  force?: boolean;
  reporter?: 'human' | 'json';
}

export function buildScaffoldJson(name: string, baseUrl: string, route: string): string {
  const content = {
    $schema: 'https://stateproof.dev/schema/v1.json',
    $comment: `Stateproof scenarios for ${name}.`,
    name,
    baseUrl,
    route,
    scenarios: [
      {
        id: `${name}-loading`,
        label: 'Loading',
        note: 'Proves the loading skeleton renders while request is pending.',
        request: {
          method: 'GET',
          urlPattern: '**/api/account',
        },
        response: {
          mode: 'delay',
          milliseconds: 2000,
        },
        expect: {
          visible: "[data-state='loading']",
          timeoutMs: 15000,
          stableMs: 250,
        },
      },
    ],
  };
  return `${JSON.stringify(content, null, 2)}\n`;
}

export async function runInit(options: InitCommandOptions): Promise<number> {
  const filePath = options.file ?? 'stateproof.scenarios.json';
  const targetPath = resolve(process.cwd(), filePath);
  const reporter = options.reporter ?? 'human';

  if (existsSync(targetPath) && !options.force) {
    const error = new StateproofError({
      code: 'SCHEMA_INVALID',
      message: `Scenario file already exists at "${filePath}".`,
      hint: 'Use --force to overwrite the existing file or edit it directly.',
      file: filePath,
    });
    if (reporter === 'json') {
      emitJsonEnvelope({
        type: 'init.result',
        data: null,
        error: {
          code: error.code,
          message: error.message,
          hint: error.hint,
          ...(error.file !== undefined ? { file: error.file } : {}),
          runId: null,
        },
        exitCode: 2,
      });
      return 2;
    }
    throw error;
  }

  const baseDir = dirname(targetPath);
  mkdirSync(baseDir, { recursive: true });

  const url = options.url ?? 'http://localhost:5173';
  const route = options.route ?? '/';
  const name = filePath.replace(/\.scenarios\.json$|\.json$/, '').replace(/[^a-z0-9-]/gi, '-').toLowerCase() || 'account-settings';

  writeFileSync(targetPath, buildScaffoldJson(name, url, route), 'utf-8');

  // Create fixtures directory
  const fixturesDir = join(baseDir, 'fixtures');
  mkdirSync(fixturesDir, { recursive: true });

  // Update .gitignore if present or create one
  const gitignorePath = join(process.cwd(), '.gitignore');
  const ignoreEntry = 'artifacts/\n';
  if (existsSync(gitignorePath)) {
    const existing = readFileSync(gitignorePath, 'utf-8');
    if (!existing.includes('artifacts/') && !existing.includes('artifacts')) {
      writeFileSync(gitignorePath, `${existing.endsWith('\n') ? '' : '\n'}${ignoreEntry}`, { flag: 'a' });
    }
  } else {
    writeFileSync(gitignorePath, ignoreEntry, 'utf-8');
  }

  if (reporter === 'json') {
    emitJsonEnvelope({
      type: 'init.result',
      data: {
        file: filePath,
        fixturesDir: 'fixtures',
        name,
        baseUrl: url,
        route,
      },
      exitCode: 0,
    });
  } else {
    process.stdout.write(
      `${pc.green('✔')} Initialized Stateproof scenario file at ${pc.bold(filePath)}\n` +
      `  • Scaffolding: strict JSON with $comment and note fields\n` +
      `  • Fixtures directory: ${pc.dim('fixtures/')}\n` +
      `  • Updated: ${pc.dim('.gitignore (artifacts/)')}\n`,
    );
  }

  return 0;
}
