#!/usr/bin/env node
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

async function walkEntries() {
  const entries = [];
  const base = join(root, 'entries');
  let groups;
  try {
    groups = await readdir(base, { withFileTypes: true });
  } catch {
    return entries;
  }
  for (const g of groups) {
    if (!g.isDirectory()) continue;
    const files = await readdir(join(base, g.name));
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      const record = JSON.parse(await readFile(join(base, g.name, f), 'utf8'));
      entries.push(record);
    }
  }
  return entries;
}

function toListingRow(record) {
  const m = record.manifest ?? {};
  return {
    id: record.id,
    legacy_id: record.legacy_id,
    name: m.name ?? record.id,
    url: record.url,
    description: m.description ?? '',
    primary_category: m.primary_category,
    categories: m.categories ?? [],
    pricing_model: m.pricing?.model,
    payment_model: m.payment?.model ?? null,
    payment_currency: m.payment?.currency ?? null,
    settlement_type: m.payment?.settlement?.type ?? null,
    supports_spend_cap: m.payment?.budget_controls?.supports_spend_cap ?? null,
    auth_required: m.authentication?.required ?? false,
    maintained_by: m.reliability?.maintained_by ?? 'individual',
    badges: record.badges ?? [],
    status: record.status,
    verified_at: record.verified_at,
    last_checked_at: record.last_checked_at,
    last_valid: record.last_valid,
    listing_url: `https://agent-manifest.com/apis/${record.id}/`,
  };
}

async function main() {
  const records = await walkEntries();
  const index = {
    generated_at: new Date().toISOString(),
    count: records.length,
    entries: records,
    listings: records.map(toListingRow),
  };

  await mkdir(join(root, 'public', 'registry'), { recursive: true });
  await mkdir(join(root, 'worker', 'data'), { recursive: true });

  const out = JSON.stringify(index, null, 2);
  await writeFile(join(root, 'public', 'registry', 'index.json'), out);
  await writeFile(join(root, 'worker', 'data', 'index.json'), out);

  for (const record of records) {
    await writeFile(
      join(root, 'public', 'registry', `${record.id}.json`),
      JSON.stringify(record, null, 2)
    );
  }

  console.log(`Built index with ${records.length} entries`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
