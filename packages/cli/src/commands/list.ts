import {
  executeList,
  loadAndValidateScenarioFile,
} from '@stateproof/app';
import { renderHumanListSummary } from '../reporters/human.js';
import { emitJsonEnvelope } from '../reporters/json.js';

export { loadAndValidateScenarioFile };

export interface ListCommandOptions {
  file?: string;
  reporter?: 'human' | 'json';
}

export async function runList(options: ListCommandOptions): Promise<number> {
  const reporter = options.reporter ?? 'human';
  const appResult = await executeList({ file: options.file });

  if (reporter === 'json') {
    emitJsonEnvelope(appResult.envelope);
  } else {
    process.stdout.write(`${renderHumanListSummary(appResult.file)}\n`);
  }

  return 0;
}
