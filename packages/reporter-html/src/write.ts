import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { RunResult } from '@stateproof-dev/core';
import { renderHtmlReport } from './render.js';

export interface WriteReportOptions {
  result: RunResult;
  artifactDir: string;
  outputDir?: string | undefined;
}

export interface ReportResult {
  htmlPath: string;
  assetsDir: string;
  assetCount: number;
}

export async function writeHtmlReport(options: WriteReportOptions): Promise<ReportResult> {
  const artifactDir = resolve(options.artifactDir);
  const outputDir = resolve(options.outputDir ?? join(artifactDir, 'report'));
  const assetsDir = join(outputDir, 'assets');

  mkdirSync(outputDir, { recursive: true });
  mkdirSync(assetsDir, { recursive: true });

  const html = renderHtmlReport(options.result);
  const htmlPath = join(outputDir, 'index.html');
  writeFileSync(htmlPath, html, 'utf-8');

  let assetCount = 0;
  for (const scenario of options.result.scenarios) {
    const screenshot = scenario.artifacts.screenshot;
    if (screenshot) {
      const src = join(artifactDir, screenshot);
      const dest = join(assetsDir, screenshot);
      if (existsSync(src)) {
        copyFileSync(src, dest);
        assetCount += 1;
      }
    }

    if (scenario.visualDiff) {
      const diffFiles = [
        scenario.visualDiff.baseline,
        scenario.visualDiff.current,
        scenario.visualDiff.diff,
      ].filter(Boolean) as string[];

      for (const diffFile of diffFiles) {
        const src = join(artifactDir, diffFile);
        const dest = join(assetsDir, diffFile);
        if (existsSync(src)) {
          copyFileSync(src, dest);
          assetCount += 1;
        }
      }
    }
  }

  return {
    htmlPath,
    assetsDir,
    assetCount,
  };
}
