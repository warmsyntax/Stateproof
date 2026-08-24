import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import * as p from '@clack/prompts';
import {
  executeRun,
  loadAndValidateScenarioFile,
  runSecretAudit,
  type AppRunOptions,
} from '@stateproof/app';
import { StateproofError } from '@stateproof/core';
import pc from 'picocolors';
import { renderHumanRunSummary } from '../reporters/human.js';

export interface StudioCommandOptions {
  file?: string | undefined;
  url?: string | undefined;
  allowRemote?: boolean | undefined;
  allowThirdParty?: boolean | undefined;
  strictSecrets?: boolean | undefined;
  headed?: boolean | undefined;
  baselineDir?: string | undefined;
  diffThreshold?: number | undefined;
}

export function openPathInBrowser(targetPath: string): void {
  const cmd =
    process.platform === 'win32'
      ? `start "" "${targetPath}"`
      : process.platform === 'darwin'
        ? `open "${targetPath}"`
        : `xdg-open "${targetPath}"`;
  exec(cmd);
}

export async function runStudio(options: StudioCommandOptions): Promise<number> {
  // Enforce TTY requirement (Contract §9.3)
  if (!process.stdout.isTTY) {
    throw new StateproofError({
      code: 'INTERACTIVE_TTY_REQUIRED',
      message: 'stateproof studio requires an interactive TTY terminal session.',
      hint: 'Run stateproof run for non-interactive CI/CD execution.',
    });
  }

  p.intro(pc.bgCyan(pc.black(' stateproof studio ')));

  const filePath = options.file ?? 'stateproof.scenarios.json';
  const { file, absolutePath } = loadAndValidateScenarioFile(filePath);

  // Secret audit check
  runSecretAudit(file.scenarios, absolutePath, Boolean(options.strictSecrets), (msg) => {
    p.log.warn(msg);
  });

  let keepRunning = true;
  let lastExitCode = 0;

  while (keepRunning) {
    // 1. Scenario selection
    const scenarioChoices = file.scenarios.map((s) => ({
      value: s.id,
      label: s.label ? `${s.label} (${s.id})` : s.id,
      hint: `${s.request.method} ${s.request.urlPattern}`,
    }));

    const selectedScenarioIds = (await p.multiselect({
      message: 'Select scenarios to execute:',
      options: scenarioChoices,
      initialValues: file.scenarios.map((s) => s.id),
      required: true,
    })) as string[];

    if (p.isCancel(selectedScenarioIds)) {
      p.cancel('Studio session cancelled.');
      return 0;
    }

    // 2. Viewport selection
    const viewportChoices = (file.viewports ?? [
      { name: 'desktop', width: 1440, height: 1024 },
      { name: 'mobile', width: 390, height: 844 },
    ]).map((v) => ({
      value: v.name,
      label: `${v.name} (${v.width}x${v.height})`,
    }));

    const selectedViewportNames = (await p.multiselect({
      message: 'Select target viewports:',
      options: viewportChoices,
      initialValues: viewportChoices.map((v) => v.value),
      required: true,
    })) as string[];

    if (p.isCancel(selectedViewportNames)) {
      p.cancel('Studio session cancelled.');
      return 0;
    }

    // 3. Mode selection
    const mode = (await p.select({
      message: 'Select action to perform:',
      options: [
        { value: 'run', label: 'Run State Validation', hint: 'Catch-all interception & assertions' },
        { value: 'diff', label: 'Run Visual Diff Regression', hint: 'Compare screenshots against committed baselines' },
        { value: 'update-baselines', label: 'Update Visual Baselines', hint: 'Save current captures to stateproof/baselines/' },
      ],
    })) as 'run' | 'diff' | 'update-baselines';

    if (p.isCancel(mode)) {
      p.cancel('Studio session cancelled.');
      return 0;
    }

    // 4. Execution
    const s = p.spinner();
    s.start('Running scenarios in Chromium...');

    try {
      const runOptions: AppRunOptions = {
        file: filePath,
        scenario: selectedScenarioIds,
        viewport: selectedViewportNames,
        url: options.url,
        allowRemote: options.allowRemote,
        allowThirdParty: options.allowThirdParty,
        strictSecrets: options.strictSecrets,
        baselineDir: options.baselineDir,
        diffThreshold: options.diffThreshold,
        diff: mode === 'diff',
        updateBaselines: mode === 'update-baselines',
      };

      const result = await executeRun(runOptions);
      lastExitCode = result.exitCode;

      if (result.exitCode === 0) {
        s.stop(pc.green(`Execution completed successfully (${result.result.scenarios.length} combo(s) passed).`));
      } else {
        const failedCount = result.result.scenarios.filter((sc) => sc.status !== 'passed').length;
        s.stop(pc.red(`Execution finished with ${failedCount} failure(s) / error(s).`));
      }

      // Print summary
      process.stdout.write(
        `\n${renderHumanRunSummary(file.name, result.result, result.artifactDir, result.exitCode)}\n\n`,
      );

      // Post-run menu
      const postAction = await p.select({
        message: 'Next step:',
        options: [
          { value: 'open-report', label: 'Open HTML Report in browser' },
          { value: 'rerun', label: 'Run again' },
          { value: 'exit', label: 'Exit Studio' },
        ],
      });

      if (p.isCancel(postAction) || postAction === 'exit') {
        keepRunning = false;
      } else if (postAction === 'open-report') {
        const reportHtml = join(result.artifactDir, 'report', 'index.html');
        if (existsSync(reportHtml)) {
          openPathInBrowser(reportHtml);
          p.log.success(`Opened ${reportHtml}`);
        } else {
          p.log.error(`Report file not found at ${reportHtml}`);
        }

        const again = await p.confirm({
          message: 'Perform another action in Studio?',
          initialValue: true,
        });
        if (p.isCancel(again) || !again) {
          keepRunning = false;
        }
      }
    } catch (err) {
      s.stop(pc.red('Execution failed with error.'));
      p.log.error(err instanceof Error ? err.message : String(err));
      lastExitCode = 1;
      const again = await p.confirm({
        message: 'Try again?',
        initialValue: true,
      });
      if (p.isCancel(again) || !again) {
        keepRunning = false;
      }
    }
  }

  p.outro(pc.cyan('Stateproof Studio session finished.'));
  return lastExitCode;
}
