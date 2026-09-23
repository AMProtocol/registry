import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveManifestUrl, validateManifest } from './index.mjs';

test('resolveManifestUrl uses origin', () => {
  assert.equal(
    resolveManifestUrl('https://packrift.github.io/foo'),
    'https://packrift.github.io/.well-known/agent-manifest.json'
  );
});

test('freemium passes v0.2 schema', () => {
  const manifest = {
    spec_version: 'agentmanifest-0.2',
    name: 'Test API',
    version: '1.0.0',
    description: 'x'.repeat(100),
    categories: ['other'],
    primary_category: 'reference',
    endpoints: [
      {
        path: '/x',
        method: 'GET',
        description: 'Test endpoint for validation',
        parameters: [],
        response_description: 'Returns test data for the validation suite',
      },
    ],
    pricing: { model: 'freemium', free_tier: { queries_per_day: 10 } },
    authentication: { required: false, type: 'none' },
    reliability: { maintained_by: 'individual' },
    agent_notes: 'Free tier then paid. Mention account pricing and authentication for agents.',
    contact: 'a@b.com',
    listing_requested: false,
    last_updated: '2026-01-01T00:00:00Z',
  };
  const r = validateManifest(manifest);
  assert.equal(r.ok, true);
});
