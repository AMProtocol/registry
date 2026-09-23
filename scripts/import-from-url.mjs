#!/usr/bin/env node
/**
 * Fetch manifest from URL, validate record shape, write entries/submit/<slug>.json
 * Usage: node scripts/import-from-url.mjs <api-url> [contact-email]
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRecord } from '../rules/index.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const apiUrl = process.argv[2];
const contact = process.argv[3] || '';

if (!apiUrl) {
  console.error('Usage: node scripts/import-from-url.mjs <api-url> [contact]');
  process.exit(1);
}

function slugFromUrl(url) {
  const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
  return host.replace(/\./g, '-').replace(/^www-/, '');
}

async function fetchManifest(url) {
  const base = url.startsWith('http') ? url : `https://${url}`;
  const manifestUrl = new URL('/.well-known/agent-manifest.json', base).href;
  const res = await fetch(manifestUrl);
  if (!res.ok) throw new Error(`Manifest fetch failed: ${res.status}`);
  return JSON.parse(await res.text());
}

const manifest = await fetchManifest(apiUrl);
const slug = slugFromUrl(apiUrl);
const id = slug;
const now = new Date().toISOString();

const record = {
  id,
  url: apiUrl.startsWith('http') ? apiUrl : `https://${apiUrl}`,
  status: 'verified',
  source: 'submission',
  created_at: now,
  verified_at: now,
  last_checked_at: now,
  publisher: contact ? { contact } : {},
  manifest,
  badges: [],
};

const result = validateRecord(record);
if (!result.ok) {
  console.error('Record validation failed:', result.errors);
  process.exit(1);
}

const dir = join(root, 'entries', 'submit');
await mkdir(dir, { recursive: true });
const outPath = join(dir, `${id}.json`);
await writeFile(outPath, JSON.stringify(record, null, 2) + '\n');
console.log(`Wrote ${outPath}`);
