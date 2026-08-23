#!/usr/bin/env node
const args = process.argv.slice(2);

if (args[0] === '--version' || args[0] === '-v') {
  process.stdout.write('0.1.0\n');
  process.exit(0);
}

process.stderr.write('stateproof 0.1.0 — commands arrive in P3 (skeleton)\n');
process.exit(2);
