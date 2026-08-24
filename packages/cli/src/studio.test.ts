import { describe, expect, it } from 'vitest';
import { runStudio } from './commands/studio.js';
import { createProgram } from './main.js';

describe('stateproof studio', () => {
  it('registers studio command and tui alias in CLI program', () => {
    const program = createProgram();
    const commandNames = program.commands.map((c) => c.name());
    expect(commandNames).toContain('studio');
    const studioCmd = program.commands.find((c) => c.name() === 'studio');
    expect(studioCmd?.aliases()).toContain('tui');
    const tuiOption = program.options.find((o) => o.long === '--tui');
    expect(tuiOption).toBeDefined();
  });

  it('rejects execution in non-interactive / non-TTY environment (contract §9.3)', async () => {
    const originalIsTTY = process.stdout.isTTY;
    try {
      // Simulate non-TTY CI environment
      (process.stdout as any).isTTY = false;

      await expect(runStudio({})).rejects.toMatchObject({
        code: 'INTERACTIVE_TTY_REQUIRED',
        message: expect.stringContaining('interactive TTY'),
      });
    } finally {
      (process.stdout as any).isTTY = originalIsTTY;
    }
  });
});
