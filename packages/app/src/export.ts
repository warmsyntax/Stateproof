import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import {
  buildEnvelope,
  buildJsonCard,
  type Envelope,
  jsonCardEnvelope,
  parseScenarioText,
  type RunResult,
  renderMarkdownCard,
  StateproofError,
  scenarioFileSchema,
} from '@stateproof-dev/core';

export interface AppExportOptions {
  run?: string | undefined;
  file?: string | undefined;
  format?: 'md' | 'json' | undefined;
  artifactsRoot?: string | undefined;
}

export interface AppExportResult {
  format: 'md' | 'json';
  content: string;
  data?: unknown | undefined;
  envelope: Envelope<unknown>;
  artifactDir: string;
}

export function resolveArtifactDirectory(options: AppExportOptions): string {
  const rootDir = options.artifactsRoot ?? join(process.cwd(), 'artifacts', 'stateproof');

  if (options.run) {
    const candidate = resolve(process.cwd(), options.run);
    if (existsSync(candidate)) return candidate;
    const underRoot = join(rootDir, options.run);
    if (existsSync(underRoot)) return underRoot;
    throw new StateproofError({
      code: 'EXPORT_RUN_MISSING',
      message: `Artifact directory not found: "${options.run}"`,
      hint: 'Provide a valid artifact directory via --run or run scenarios first.',
    });
  }

  if (options.file) {
    const filePath = resolve(process.cwd(), options.file);
    if (existsSync(filePath)) {
      try {
        const text = readFileSync(filePath, 'utf-8');
        const { value } = parseScenarioText(text, options.file);
        const parsed = scenarioFileSchema.safeParse(value);
        if (parsed.success) {
          const candidate = join(rootDir, parsed.data.name);
          if (existsSync(candidate)) return candidate;
        }
      } catch {
        // Fall through
      }
    }
  }

  const defaultScenarioPath = resolve(process.cwd(), 'stateproof.scenarios.json');
  if (existsSync(defaultScenarioPath)) {
    try {
      const text = readFileSync(defaultScenarioPath, 'utf-8');
      const { value } = parseScenarioText(text, 'stateproof.scenarios.json');
      const parsed = scenarioFileSchema.safeParse(value);
      if (parsed.success) {
        const candidate = join(rootDir, parsed.data.name);
        if (existsSync(candidate)) return candidate;
      }
    } catch {
      // Fall through
    }
  }

  if (existsSync(rootDir)) {
    const entries = readdirSync(rootDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    if (entries.length === 1 && entries[0]) {
      return join(rootDir, entries[0]);
    }
    if (entries.length > 1) {
      throw new StateproofError({
        code: 'EXPORT_RUN_MISSING',
        message: `Multiple artifact directories found: ${entries.join(', ')}.`,
        hint: 'Specify which run to export using --run <artifactDir>',
      });
    }
  }

  throw new StateproofError({
    code: 'EXPORT_RUN_MISSING',
    message: 'No artifact directory found to export.',
    hint: 'Run "stateproof run" first or specify --run <artifactDir>.',
  });
}

export async function executeExport(options: AppExportOptions): Promise<AppExportResult> {
  const artifactDir = resolveArtifactDirectory(options);
  const format = options.format ?? 'md';

  const runJsonPath = join(artifactDir, 'run.json');
  const cardJsonPath = join(artifactDir, 'card.json');
  const cardMdPath = join(artifactDir, 'card.md');

  let runResult: RunResult | null = null;
  if (existsSync(runJsonPath)) {
    try {
      runResult = JSON.parse(readFileSync(runJsonPath, 'utf-8')) as RunResult;
    } catch {
      // ignore
    }
  }

  const scenarioName = runResult?.file
    ? basename(runResult.file).replace(/\.scenarios\.json$/, '')
    : basename(artifactDir);

  if (format === 'json') {
    if (existsSync(cardJsonPath)) {
      const raw = readFileSync(cardJsonPath, 'utf-8');
      const parsedEnvelope = JSON.parse(raw);
      return {
        format: 'json',
        content: raw,
        data: parsedEnvelope.data ?? parsedEnvelope,
        envelope: parsedEnvelope,
        artifactDir,
      };
    }

    if (runResult) {
      const cardData = buildJsonCard({ name: scenarioName, result: runResult });
      const envelope = jsonCardEnvelope({ name: scenarioName, result: runResult }, 0);
      const content = JSON.stringify(envelope, null, 2);
      return {
        format: 'json',
        content,
        data: cardData,
        envelope: envelope as Envelope<unknown>,
        artifactDir,
      };
    }

    throw new StateproofError({
      code: 'EXPORT_RUN_MISSING',
      message: `card.json or run.json not found in artifact directory: ${artifactDir}`,
      hint: 'Run stateproof run to generate artifacts before exporting.',
    });
  }

  if (existsSync(cardMdPath)) {
    const content = readFileSync(cardMdPath, 'utf-8');
    const envelope = buildEnvelope<string>({
      type: 'export.card',
      data: content,
      exitCode: 0,
    });
    return {
      format: 'md',
      content,
      envelope,
      artifactDir,
    };
  }

  if (runResult) {
    const content = renderMarkdownCard({ name: scenarioName, result: runResult });
    const envelope = buildEnvelope<string>({
      type: 'export.card',
      data: content,
      exitCode: 0,
    });
    return {
      format: 'md',
      content,
      envelope,
      artifactDir,
    };
  }

  throw new StateproofError({
    code: 'EXPORT_RUN_MISSING',
    message: `card.md or run.json not found in artifact directory: ${artifactDir}`,
    hint: 'Run stateproof run to generate artifacts before exporting.',
  });
}
