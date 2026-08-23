import type { ScenarioFile } from './types.js';

export const validScenarioFile: ScenarioFile = {
  name: 'account-settings',
  baseUrl: 'http://localhost:5173',
  route: '/account/settings',
  scenarios: [
    {
      id: 'account-loading',
      request: { method: 'GET', urlPattern: '**/api/account' },
      response: { mode: 'delay', milliseconds: 2000 },
      expect: { visible: "[data-state='loading']" },
    },
  ],
};

export function fileWithOverrides(overrides: Partial<ScenarioFile>): ScenarioFile {
  return { ...validScenarioFile, ...overrides };
}
