#!/usr/bin/env node
/**
 * Copy built @agentmanifest/validator into worker/vendor for Wrangler bundling.
 * Set AMP_VALIDATOR_PATH to override source (CI checks out AMProtocol/AMP).
 */
import { cp, mkdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const defaultSrc = join(root, '..', 'agentmanifest', 'validator');
const src = process.env.AMP_VALIDATOR_PATH
  ? join(process.env.AMP_VALIDATOR_PATH)
  : defaultSrc;
const dest = join(root, 'worker', 'vendor', 'validator');

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(join(src, 'dist', 'index.js')))) {
  console.error(`Validator not built at ${src}. Run: cd ${src} && npm run build`);
  process.exit(1);
}

await mkdir(dest, { recursive: true });
for (const item of ['dist', 'schemas', 'package.json']) {
  await cp(join(src, item), join(dest, item), { recursive: true, force: true });
}
console.log(`Synced validator → ${dest}`);
