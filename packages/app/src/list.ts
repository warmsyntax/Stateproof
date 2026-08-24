import {
  buildEnvelope,
  DEFAULT_VIEWPORTS,
  type Envelope,
  type ScenarioFile,
  type Viewport,
} from '@stateproof/core';
import { loadAndValidateScenarioFile } from './scenarios.js';

export interface ListResultData {
  file: string;
  name: string;
  baseUrl: string;
  route: string;
  viewports: Viewport[];
  scenarios: Array<{
    id: string;
    label?: string | undefined;
    note?: string | undefined;
    method: string;
    urlPattern: string;
    mode: string;
    visible: string | string[];
    timeoutMs: number;
    stableMs: number;
  }>;
}

export interface AppListOptions {
  file?: string | undefined;
}

export interface AppListResult {
  data: ListResultData;
  file: ScenarioFile;
  envelope: Envelope<ListResultData>;
}

export async function executeList(options: AppListOptions = {}): Promise<AppListResult> {
  const filePath = options.file ?? 'stateproof.scenarios.json';
  const { file } = loadAndValidateScenarioFile(filePath);

  const viewports = file.viewports ?? DEFAULT_VIEWPORTS;
  const listData: ListResultData = {
    file: filePath,
    name: file.name,
    baseUrl: file.baseUrl,
    route: file.route,
    viewports,
    scenarios: file.scenarios.map((s) => ({
      id: s.id,
      label: s.label,
      note: s.note,
      method: s.request.method,
      urlPattern: s.request.urlPattern,
      mode: s.response.mode,
      visible: s.expect.visible,
      timeoutMs: s.expect.timeoutMs ?? 15000,
      stableMs: s.expect.stableMs ?? 0,
    })),
  };

  const envelope = buildEnvelope<ListResultData>({
    type: 'list.result',
    data: listData,
    exitCode: 0,
  });

  return {
    data: listData,
    file,
    envelope,
  };
}
