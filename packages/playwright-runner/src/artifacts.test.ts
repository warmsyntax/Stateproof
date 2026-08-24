import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { StateproofError } from '@stateproof/core';
import { afterEach, describe, expect, it } from 'vitest';
import {
  acquireLock,
  artifactPaths,
  cleanGeneratedArtifacts,
  ensureArtifactDir,
  releaseLock,
} from './artifacts.js';

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'stateproof-artifacts-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

describe('artifact lockfile', () => {
  it('acquires and releases a lock', () => {
    const paths = artifactPaths(join(makeTempDir(), 'run'));
    ensureArtifactDir(paths);
    acquireLock(paths);
    expect(existsSync(join(paths.root, '.lock'))).toBe(true);
    releaseLock(paths);
    expect(existsSync(join(paths.root, '.lock'))).toBe(false);
  });

  it('rejects acquisition while another lock exists', () => {
    const paths = artifactPaths(join(makeTempDir(), 'run'));
    ensureArtifactDir(paths);
    acquireLock(paths);
    try {
      acquireLock(paths);
      throw new Error('expected ARTIFACT_LOCKED');
    } catch (error) {
      expect((error as StateproofError).code).toBe('ARTIFACT_LOCKED');
      expect((error as StateproofError).hint).toContain('.lock');
    }
    releaseLock(paths);
  });
});

describe('cleanGeneratedArtifacts', () => {
  it('removes generated files but preserves user content', () => {
    const paths = artifactPaths(join(makeTempDir(), 'run'));
    ensureArtifactDir(paths);
    for (const name of ['old.png', 'run.json', 'card.md', 'card.json', 'trace.md']) {
      writeFileSync(join(paths.root, name), 'x');
    }
    mkdirSync(join(paths.root, 'report'));
    writeFileSync(join(paths.root, 'report', 'index.html'), 'x');
    writeFileSync(join(paths.root, 'keep-me.txt'), 'user');

    cleanGeneratedArtifacts(paths);

    expect(existsSync(join(paths.root, 'old.png'))).toBe(false);
    expect(existsSync(join(paths.root, 'run.json'))).toBe(false);
    expect(existsSync(join(paths.root, 'report'))).toBe(false);
    expect(existsSync(join(paths.root, 'keep-me.txt'))).toBe(true);
  });
});

describe('artifactPaths.screenshot', () => {
  it('builds semantic kebab filenames', () => {
    const paths = artifactPaths('root');
    expect(paths.screenshot('account-loading', 'mobile')).toBe(
      join('root', 'account-loading.mobile.png'),
    );
  });
});
