#!/usr/bin/env node
import { engineName as coreEngine } from '@stateproof/core';
import { engineName as runnerEngine } from '@stateproof/playwright-runner';

const args = process.argv.slice(2);

if (args[0] === '--version' || args[0] === '-v') {
  process.stdout.write('0.1.0\n');
  process.exit(0);
}

process.stderr.write(
  `stateproof 0.1.0 — commands arrive in P3 (skeleton wired to ${coreEngine} + ${runnerEngine})\n`,
);
process.exit(2);
