import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  executeExport,
  resolveArtifactDirectory,
  type AppExportOptions,
} from '@stateproof/app';
import { StateproofError, type RunResult } from '@stateproof/core';
import { renderHtmlReport } from '@stateproof/reporter-html';

export interface ExportCommandOptions {
  run?: string | undefined;
  file?: string | undefined;
  format?: 'md' | 'json' | 'html' | undefined;
  artifactsRoot?: string | undefined;
  cwd?: string | undefined;
}

export { resolveArtifactDirectory as resolveExportArtifactDir };

export async function runExport(options: ExportCommandOptions): Promise<number> {
  const format = options.format ?? 'md';

  if (format === 'html') {
    const artifactDir = resolveArtifactDirectory({
      run: options.run,
      file: options.file,
      artifactsRoot: options.artifactsRoot,
    });
    const runJsonPath = join(artifactDir, 'run.json');
    if (!existsSync(runJsonPath)) {
      throw new StateproofError({
        code: 'EXPORT_RUN_MISSING',
        message: `No run.json found in artifact directory "${artifactDir}".`,
        hint: 'Run stateproof run first to generate run artifacts.',
      });
    }

    let result: RunResult;
    try {
      const raw = readFileSync(runJsonPath, 'utf-8');
      result = JSON.parse(raw) as RunResult;
    } catch (error) {
      throw new StateproofError({
        code: 'EXPORT_RUN_MISSING',
        message: `Failed to read or parse run.json in "${artifactDir}": ${error instanceof Error ? error.message : String(error)}`,
        hint: 'Re-run stateproof run to regenerate the artifact files.',
      });
    }

    const html = renderHtmlReport(result);
    process.stdout.write(`${html}\n`);
    return 0;
  }

  const appResult = await executeExport({
    run: options.run,
    file: options.file,
    format: format === 'json' ? 'json' : 'md',
    artifactsRoot: options.artifactsRoot,
  });
  if (format === 'json') {
    process.stdout.write(`${JSON.stringify(appResult.envelope, null, 2)}\n`);
  } else {
    process.stdout.write(`${appResult.content}\n`);
  }

  return 0;
}
