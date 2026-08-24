import { existsSync, mkdirSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { StateproofError } from '@stateproof/core';

export const LOCK_FILE = '.lock';

const GENERATED_FILES = ['run.json', 'card.md', 'card.json', 'trace.md'];
const GENERATED_SUFFIXES = ['.png'];

export interface ArtifactPaths {
  root: string;
  screenshot(scenarioId: string, viewportName: string): string;
  runJson: string;
  traceMd: string;
}

export function artifactPaths(rootDir: string): ArtifactPaths {
  return {
    root: rootDir,
    screenshot: (scenarioId, viewportName) => join(rootDir, `${scenarioId}.${viewportName}.png`),
    runJson: join(rootDir, 'run.json'),
    traceMd: join(rootDir, 'trace.md'),
  };
}

export function ensureArtifactDir(paths: ArtifactPaths): void {
  mkdirSync(paths.root, { recursive: true });
}

// Contract §8.3: a live .lock means another run owns the directory. Stale locks are
// the user's call to delete — we never guess.
export function acquireLock(paths: ArtifactPaths): void {
  const lockPath = join(paths.root, LOCK_FILE);
  try {
    writeFileSync(lockPath, `${new Date().toISOString()}\n`, { flag: 'wx' });
  } catch {
    throw new StateproofError({
      code: 'ARTIFACT_LOCKED',
      message: `Artifact directory is locked by another run (${lockPath}).`,
      hint: 'Wait for the other run to finish, or delete the .lock file if it is stale.',
    });
  }
}

export function releaseLock(paths: ArtifactPaths): void {
  const lockPath = join(paths.root, LOCK_FILE);
  try {
    unlinkSync(lockPath);
  } catch {
    // Lock already gone; nothing to release.
  }
}

export function cleanGeneratedArtifacts(paths: ArtifactPaths): void {
  for (const name of GENERATED_FILES) {
    const target = join(paths.root, name);
    if (existsSync(target)) unlinkSync(target);
  }
  for (const entry of readdirSync(paths.root)) {
    if (GENERATED_SUFFIXES.some((suffix) => entry.endsWith(suffix))) {
      rmSync(join(paths.root, entry), { force: true });
    }
  }
  rmSync(join(paths.root, 'report'), { recursive: true, force: true });
}
