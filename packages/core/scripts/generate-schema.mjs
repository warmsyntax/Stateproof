import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { scenarioFileSchema } from '../dist/index.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const outPath = `${here}../schema/v1.json`;

const jsonSchema = z.toJSONSchema(scenarioFileSchema, { target: 'draft-7', io: 'input' });

mkdirSync(`${here}../schema`, { recursive: true });
writeFileSync(outPath, `${JSON.stringify(jsonSchema, null, 2)}\n`, 'utf-8');
process.stdout.write(`wrote ${outPath}\n`);
