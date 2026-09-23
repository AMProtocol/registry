#!/usr/bin/env node
/**
 * Compare Worker staging vs live Railway API.
 * Usage: node scripts/contract-test.mjs --base https://api-next.agent-manifest.com
 *        node scripts/contract-test.mjs --base http://localhost:8787 --validator-base http://localhost:8787
 */
import process from 'node:process';

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const base = getArg('--base', 'https://api-next.agent-manifest.com');
const liveBase = getArg('--live', 'https://api.agent-manifest.com');
const validatorBase = getArg('--validator-base', base.replace('api-next', 'validator-next').replace('api.', 'validator.'));
const liveValidator = getArg('--live-validator', 'https://validator.agent-manifest.com');

const IGNORE_LISTING_FIELDS = new Set([
  'last_valid',
  'status',
  'listing_url',
  'last_checked_at',
  'verified_at',
]);

function pickListing(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (!IGNORE_LISTING_FIELDS.has(k)) out[k] = v;
  }
  return out;
}

async function fetchJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${url} returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return data;
}

const failures = [];

function assert(name, ok, detail = '') {
  if (!ok) failures.push({ name, detail });
  console.log(ok ? `✓ ${name}` : `✗ ${name}${detail ? `: ${detail}` : ''}`);
}

console.log(`\nContract test: ${base} vs ${liveBase}\n`);

// Health
const health = await fetchJson(`${base}/health`);
assert('health.status', health.status === 'healthy');
assert('health.service', health.service === 'agentmanifest-api');

// Listings count — worker may have more (seeds); require live ⊆ worker field parity for overlap
const liveListings = await fetchJson(`${liveBase}/listings?limit=500`);
const stagingListings = await fetchJson(`${base}/listings?limit=500`);
assert('listings.meta.spec_version', stagingListings.meta?.spec_version === 'agentmanifest-0.3');
assert(
  'listings.count >= live',
  stagingListings.data.count >= liveListings.data.count,
  `staging ${stagingListings.data.count} < live ${liveListings.data.count}`
);

const stagingById = new Map(stagingListings.data.listings.map((l) => [l.id, l]));
for (const live of liveListings.data.listings.slice(0, 20)) {
  const staging = stagingById.get(live.id);
  if (!staging) {
    assert(`listing present: ${live.id}`, false, 'missing on staging');
    continue;
  }
  const a = JSON.stringify(pickListing(staging));
  const b = JSON.stringify(pickListing(live));
  assert(`listing parity: ${live.id}`, a === b, 'field mismatch');
}

// Categories shape
const liveCats = await fetchJson(`${liveBase}/categories`);
const stagingCats = await fetchJson(`${base}/categories`);
assert('categories.total_categories', typeof stagingCats.data?.total_categories === 'number');
const liveCatMap = new Map(liveCats.data.categories.map((c) => [c.category, c.count]));
for (const { category, count } of stagingCats.data.categories) {
  const liveCount = liveCatMap.get(category);
  if (liveCount !== undefined) {
    assert(`category count ${category}`, count >= liveCount, `staging ${count} < live ${liveCount}`);
  }
}

// Validator health (if validator-next or same worker)
try {
  const vHealth = await fetchJson(`${validatorBase}/health`);
  assert('validator.health', vHealth.service === 'agentmanifest-validator');
  const spec = await fetchJson(`${validatorBase}/spec`);
  assert('validator.spec', spec.$schema || spec.title || spec.type);
  const liveValidation = await fetch(`${liveValidator}/validate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: 'https://bakebase.agent-manifest.com' }),
  })
    .then((r) => r.json())
    .catch(() => null);
  if (liveValidation) {
    const stagingValidation = await fetch(`${validatorBase}/validate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://bakebase.agent-manifest.com' }),
    }).then((r) => r.json());
    assert('validate.bakebase.passed', stagingValidation.passed === liveValidation.passed);
  }
} catch (e) {
  console.log(`⚠ validator checks skipped: ${e.message}`);
}

console.log(`\n${failures.length ? `FAILED (${failures.length})` : 'PASSED'}\n`);
if (failures.length) {
  for (const f of failures) console.error(`  - ${f.name}: ${f.detail}`);
  process.exit(1);
}
