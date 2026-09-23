import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function load(rel) {
  return JSON.parse(readFileSync(join(root, rel), 'utf8'));
}

export const manifestV02 = load('schemas/v0.2/manifest.json');
export const manifestV03 = load('schemas/v0.3/manifest.json');
export const registryRecord = load('schemas/registry-record.json');

export const MANIFEST_SCHEMAS = {
  'agentmanifest-0.2': manifestV02,
  'agentmanifest-0.3': manifestV03,
};
