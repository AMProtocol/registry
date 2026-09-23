#!/usr/bin/env node
/** Import the seven curated seed APIs using sources/*.yaml overrides. */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import YAML from 'yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ampCli = join(root, '..', 'amp-cli', 'dist', 'index.js');

async function runAmpImport(specUrl, overridesPath, outPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [ampCli, 'import', 'openapi', specUrl, '-o', overridesPath, '--out', outPath],
      { stdio: 'inherit', cwd: root }
    );
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else {
        console.warn(`Skipped ${id}: import exited ${code}`);
        resolve();
      }
    });
  });
}

async function main() {
  const sourcesDir = join(root, 'sources');
  const files = (await readdir(sourcesDir)).filter((f) => f.endsWith('.yaml'));
  for (const file of files) {
    const overrides = YAML.parse(await readFile(join(sourcesDir, file), 'utf8'));
    const id = overrides.id ?? file.replace('.yaml', '');
    const specUrl = overrides.openapi_url;
    if (!specUrl) {
      console.warn(`Skipping ${file}: no openapi_url`);
      continue;
    }
    const overridesPath = join(sourcesDir, file);
    const outPath = join(root, 'entries', 'seed', `${id}.json`);
    await mkdir(dirname(outPath), { recursive: true });
    console.log(`Importing ${id} from ${specUrl}`);
    await runAmpImport(specUrl, overridesPath, outPath);
  }
  console.log('Seed import complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
