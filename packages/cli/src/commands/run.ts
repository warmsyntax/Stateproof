import {
  executeRun,
  resolveSelectedScenarios,
  resolveSelectedViewports,
  runSecretAudit,
  type AppRunOptions,
} from '@stateproof/app';
import pc from 'picocolors';
import { renderHumanRunSummary } from '../reporters/human.js';
import { emitJsonEnvelope } from '../reporters/json.js';

export { resolveSelectedScenarios, resolveSelectedViewports, runSecretAudit };

export interface RunCommandOptions extends AppRunOptions {
  reporter?: 'human' | 'json' | undefined;
}

export async function runRun(options: RunCommandOptions): Promise<number> {
  const reporter = options.reporter ?? 'human';
  const appResult = await executeRun(options);

  if (reporter === 'json') {
    emitJsonEnvelope(appResult.envelope);
  } else {
    const fileName = options.file ?? 'stateproof.scenarios.json';
    process.stdout.write(
      `${renderHumanRunSummary(fileName, appResult.result, appResult.artifactDir, appResult.exitCode)}\n`,
    );
    if (appResult.fatal) {
      process.stderr.write(
        pc.red(`\nFatal error (${appResult.fatal.code}): ${appResult.fatal.message}\n`) +
          pc.cyan(`hint: ${appResult.fatal.hint}\n`),
      );
    }
  }

  return appResult.exitCode;
}
