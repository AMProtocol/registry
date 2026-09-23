#!/usr/bin/env node
// Migrate all listings from a Phase 0 backup into entries/<group>/<id>.json

import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveManifestUrl, publisherGroup } from '../rules/index.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const backupDir = process.argv[2] ?? join(root, '..', 'backups', 'registry-2026-09-23');

function groupFromListing(row, detail) {
  const contact = detail?.data?.contact ?? '';
  if (contact.includes('@')) {
    return contact.split('@')[1].toLowerCase().replace(/\./g, '-');
  }
  try {
    return new URL(row.url).hostname.replace(/\./g, '-');
  } catch {
    return 'unknown';
  }
}

async function main() {
  const summary = JSON.parse(await readFile(join(backupDir, 'summary.json'), 'utf8'));
  console.log(`Migrating ${summary.count} listings from ${backupDir}`);

  for (const row of summary.listings) {
    const detail = JSON.parse(await readFile(join(backupDir, 'details', `${row.id}.json`), 'utf8'));
    const d = detail.data;
    const stored = d.manifest;
    const livePath = join(backupDir, 'live', `${row.id}.json`);
    let liveManifest = stored;
    try {
      const live = JSON.parse(await readFile(livePath, 'utf8'));
      if (live.status === 200 && typeof live.body === 'object') liveManifest = live.body;
    } catch {
      /* use stored */
    }

    const validationPath = join(backupDir, 'validation', `${row.id}.json`);
    let validation = { passed: true, badges: [] };
    try {
      validation = JSON.parse(await readFile(validationPath, 'utf8'));
    } catch {
      /* no validation file */
    }

    const domain = new URL(row.url).hostname;
    const record = {
      id: row.id,
      legacy_id: row.id,
      status: validation.passed === false ? 'lapsed' : 'verified',
      submitted_via: 'migration',
      url: row.url,
      manifest_url: resolveManifestUrl(row.url),
      publisher: {
        domain,
        group: groupFromListing(row, detail),
        contact: d.contact,
      },
      source: { type: 'migration', url: row.url, retrieved_at: summary.exported_at },
      representative_queries: [],
      badges: validation.badges ?? [],
      created_at: d.created_at ?? summary.exported_at,
      verified_at: d.verified_at ?? summary.exported_at,
      last_checked_at: summary.exported_at,
      consecutive_failures: validation.passed === false ? 2 : 0,
      last_valid: {
        validated_at: d.verified_at ?? summary.exported_at,
        spec_version: stored.spec_version,
        manifest_last_updated: stored.last_updated ?? null,
        snapshot: stored,
      },
      current_errors: validation.passed === false ? (row.validation_errors ?? []) : [],
      manifest: validation.passed === false ? stored : liveManifest,
    };

    const group = record.publisher.group;
    const dir = join(root, 'entries', group);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${record.id}.json`), JSON.stringify(record, null, 2));
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
