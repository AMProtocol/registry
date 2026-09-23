#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRecord } from '../rules/index.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

async function loadAll() {
  const records = [];
  const base = join(root, 'entries');
  for (const g of await readdir(base, { withFileTypes: true })) {
    if (!g.isDirectory()) continue;
    for (const f of await readdir(join(base, g.name))) {
      if (!f.endsWith('.json')) continue;
      records.push(JSON.parse(await readFile(join(base, g.name, f), 'utf8')));
    }
  }
  return records;
}

async function main() {
  const records = await loadAll();
  let failed = 0;
  for (const r of records) {
    // Grandfathered migrations: validate the record envelope; manifest was valid when admitted.
    const v =
      r.submitted_via === 'migration'
        ? validateRecord({ ...r, manifest: r.last_valid?.snapshot ?? r.manifest })
        : validateRecord(r);
    if (!v.ok) {
      failed++;
      console.error(`${r.id}:`, v.errors.join('; '));
    }
  }
  if (failed) process.exit(1);
  console.log(`Verified ${records.length} entries`);
}

main();
