#!/usr/bin/env node
/** Write the seven curated unverified seed entries. */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import YAML from 'yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const now = new Date().toISOString();

async function recordFromYaml(file, manifest) {
  const overrides = YAML.parse(await readFile(join(root, 'sources', file), 'utf8'));
  const domain = new URL(manifest.homepage).hostname;
  return {
    id: overrides.id,
    legacy_id: null,
    status: 'unverified',
    submitted_via: 'import',
    url: manifest.homepage,
    manifest_url: null,
    publisher: { domain, group: 'seed', contact: overrides.contact ?? `https://${domain}` },
    source: {
      type: 'openapi',
      url: overrides.openapi_url ?? manifest.homepage,
      retrieved_at: now,
    },
    representative_queries: overrides.representative_queries ?? [],
    badges: [],
    created_at: now,
    verified_at: null,
    last_checked_at: now,
    consecutive_failures: 0,
    last_valid: null,
    current_errors: [],
    manifest,
  };
}

const handSeeds = [
  {
    file: 'swapi.yaml',
    manifest: {
      spec_version: 'agentmanifest-0.3',
      name: 'SWAPI',
      version: '1.0.0',
      description:
        'The Star Wars API (SWAPI) is a free, read-only REST API for Star Wars data: people, starships, planets, films, and species. No authentication required.',
      homepage: 'https://swapi.dev',
      categories: ['other'],
      primary_category: 'reference',
      endpoints: [
        {
          path: '/api/starships/10',
          method: 'GET',
          description: 'Retrieve a starship by ID — includes max_atmosphering_speed for the Millennium Falcon.',
          parameters: [],
          response_description: 'JSON starship object with name, model, manufacturer, and speed fields.',
        },
        {
          path: '/api/people',
          method: 'GET',
          description: 'List Star Wars characters with pagination.',
          parameters: [],
          response_description: 'Paginated JSON list of people resources.',
        },
      ],
      pricing: { model: 'free', free_tier: { queries_per_day: null }, paid_tier: null },
      payment: null,
      authentication: { required: false, type: 'none' },
      agent_notes:
        'No account or authentication. Pricing is free. Use GET endpoints only. Pagination uses next/previous URLs in the response. For starship speed questions, fetch /api/starships/10 (Millennium Falcon).',
      contact: 'https://swapi.dev',
      listing_requested: false,
      last_updated: now,
    },
  },
  {
    file: 'pokemon-tcg.yaml',
    manifest: {
      spec_version: 'agentmanifest-0.3',
      name: 'Pokemon TCG API',
      version: '2.0.0',
      description:
        'The Pokemon TCG API provides card images, set data, and card details for the Pokemon Trading Card Game. API key required for production use; generous free tier.',
      homepage: 'https://api.pokemontcg.io',
      categories: ['commerce', 'other'],
      primary_category: 'reference',
      endpoints: [
        {
          path: '/v2/cards',
          method: 'GET',
          description: 'Search Pokemon TCG cards by name, set, or type.',
          parameters: [{ name: 'q', type: 'string', required: false, description: 'Search query' }],
          response_description: 'Paginated card objects with images and set metadata.',
        },
      ],
      pricing: { model: 'freemium', free_tier: { queries_per_day: 1000 }, paid_tier: null },
      payment: null,
      authentication: {
        required: true,
        type: 'api_key',
        instructions: 'Register at dev.pokemontcg.io for an API key; send X-Api-Key header.',
      },
      agent_notes:
        'Create a free account at dev.pokemontcg.io for an API key. Authentication uses the X-Api-Key header. Pricing is freemium with a free tier; see the developer portal for limits.',
      contact: 'https://dev.pokemontcg.io',
      listing_requested: false,
      last_updated: now,
    },
  },
  {
    file: 'coingecko.yaml',
    manifest: {
      spec_version: 'agentmanifest-0.3',
      name: 'CoinGecko API',
      version: '3.0.0',
      description:
        'CoinGecko provides cryptocurrency prices, market cap, volume, and historical data for thousands of coins. Free demo API key available; rate limits apply.',
      homepage: 'https://api.coingecko.com',
      categories: ['finance'],
      primary_category: 'live',
      endpoints: [
        {
          path: '/api/v3/simple/price',
          method: 'GET',
          description: 'Get current price of one or more coins in a fiat currency.',
          parameters: [
            { name: 'ids', type: 'string', required: true, description: 'Comma-separated coin ids' },
            { name: 'vs_currencies', type: 'string', required: true, description: 'e.g. usd' },
          ],
          response_description: 'JSON map of coin id to fiat prices.',
        },
      ],
      pricing: { model: 'freemium', free_tier: { queries_per_month: 10000 }, paid_tier: null },
      payment: null,
      authentication: {
        required: false,
        type: 'none',
        instructions: 'Optional x-cg-demo-api-key header for higher limits.',
      },
      agent_notes:
        'No account required for basic use; optional demo API key improves rate limits. Pricing is freemium. Use coin ids like bitcoin, ethereum. Respect rate limits and cache responses.',
      contact: 'https://www.coingecko.com/en/api',
      listing_requested: false,
      last_updated: now,
    },
  },
  {
    file: 'openweathermap.yaml',
    manifest: {
      spec_version: 'agentmanifest-0.3',
      name: 'OpenWeatherMap',
      version: '2.5.0',
      description:
        'OpenWeatherMap provides current weather, forecasts, and historical data worldwide. Free tier with API key; one-call endpoint for current + forecast.',
      homepage: 'https://api.openweathermap.org',
      categories: ['weather'],
      primary_category: 'live',
      endpoints: [
        {
          path: '/data/2.5/weather',
          method: 'GET',
          description: 'Current weather for a city name or lat/lon.',
          parameters: [
            { name: 'q', type: 'string', required: false, description: 'City name' },
            { name: 'appid', type: 'string', required: true, description: 'API key' },
          ],
          response_description: 'Current conditions JSON including temp, humidity, and description.',
        },
      ],
      pricing: { model: 'freemium', free_tier: { queries_per_day: 1000 }, paid_tier: null },
      payment: null,
      authentication: {
        required: true,
        type: 'api_key',
        instructions: 'Sign up at openweathermap.org; pass appid query parameter.',
      },
      agent_notes:
        'Create a free account at openweathermap.org for an API key (appid). Authentication is via the appid query parameter. Pricing is freemium with daily call limits on the free tier.',
      contact: 'https://openweathermap.org/api',
      listing_requested: false,
      last_updated: now,
    },
  },
  {
    file: 'resend.yaml',
    manifest: {
      spec_version: 'agentmanifest-0.3',
      name: 'Resend',
      version: '1.0.0',
      description:
        'Resend is a modern email API for developers. Send transactional emails, manage domains, and track delivery with a simple REST API.',
      homepage: 'https://api.resend.com',
      categories: ['computing'],
      primary_category: 'transactional',
      endpoints: [
        {
          path: '/emails',
          method: 'POST',
          description: 'Send a transactional email with HTML or text body.',
          parameters: [],
          response_description: 'Returns email id and delivery status.',
        },
      ],
      pricing: { model: 'freemium', free_tier: { queries_per_day: 100 }, paid_tier: null },
      payment: null,
      authentication: {
        required: true,
        type: 'bearer',
        instructions: 'Create an API key at resend.com; send Authorization: Bearer <key>.',
      },
      agent_notes:
        'Sign up at resend.com for an API key. Authentication uses Bearer token in the Authorization header. Pricing is freemium with a free tier for development; see resend.com/pricing for production limits.',
      contact: 'https://resend.com',
      listing_requested: false,
      last_updated: now,
    },
  },
  {
    file: 'stripe.yaml',
    manifest: {
      spec_version: 'agentmanifest-0.3',
      name: 'Stripe',
      version: '1.0.0',
      description:
        'Stripe is a payments platform. This AMP entry highlights payment links, products, and prices — the subset agents most often need for checkout flows.',
      homepage: 'https://api.stripe.com',
      categories: ['finance', 'commerce'],
      primary_category: 'transactional',
      endpoints: [
        {
          path: '/v1/payment_links',
          method: 'POST',
          description: 'Create a payment link customers can use to complete checkout.',
          parameters: [],
          response_description: 'Payment link object with url field.',
        },
        {
          path: '/v1/products',
          method: 'GET',
          description: 'List products in the Stripe account.',
          parameters: [],
          response_description: 'Paginated list of product objects.',
        },
        {
          path: '/v1/prices',
          method: 'GET',
          description: 'List prices for products.',
          parameters: [],
          response_description: 'Paginated list of price objects.',
        },
      ],
      pricing: { model: 'usage_based', free_tier: null, paid_tier: null },
      payment: null,
      authentication: {
        required: true,
        type: 'bearer',
        instructions: 'Use a secret API key from the Stripe dashboard; Bearer sk_live_... or sk_test_...',
      },
      agent_notes:
        'Create a Stripe account and obtain a secret API key from the dashboard. Authentication is Bearer with your secret key. Pricing is usage-based per payment processed; see stripe.com/pricing. Use idempotency keys for POST requests.',
      contact: 'https://stripe.com',
      listing_requested: false,
      last_updated: now,
    },
  },
  {
    file: 'pinecone.yaml',
    manifest: {
      spec_version: 'agentmanifest-0.3',
      name: 'Pinecone',
      version: '1.0.0',
      description:
        'Pinecone is a managed vector database for semantic search and RAG. Upsert, query, and manage embeddings at scale with a hosted API.',
      homepage: 'https://api.pinecone.io',
      categories: ['computing'],
      primary_category: 'computational',
      endpoints: [
        {
          path: '/indexes/{index_name}/query',
          method: 'POST',
          description: 'Query a vector index for nearest neighbors.',
          parameters: [],
          response_description: 'Matching vectors with scores and metadata.',
        },
      ],
      pricing: { model: 'freemium', free_tier: { queries_per_month: null }, paid_tier: null },
      payment: null,
      authentication: {
        required: true,
        type: 'api_key',
        instructions: 'Create a Pinecone account; use the Api-Key header from the console.',
      },
      agent_notes:
        'Create a Pinecone account for an API key. Authentication uses the Api-Key header. Pricing is freemium with a starter tier; check the console for usage limits and payment onboarding.',
      contact: 'https://www.pinecone.io',
      listing_requested: false,
      last_updated: now,
    },
  },
];

async function runCliImport(id) {
  const overridesPath = join(root, 'sources', `${id}.yaml`);
  const spec = YAML.parse(await readFile(overridesPath, 'utf8'));
  if (!spec.openapi_url) return;
  const ampCli = join(root, '..', 'amp-cli', 'dist', 'index.js');
  const outPath = join(root, 'entries', 'seed', `${id}.json`);
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [ampCli, 'import', 'openapi', spec.openapi_url, '-o', overridesPath, '--out', outPath],
      { stdio: 'inherit' }
    );
    child.on('exit', () => resolve());
  });
}

async function main() {
  const dir = join(root, 'entries', 'seed');
  await mkdir(dir, { recursive: true });

  for (const { file, manifest } of handSeeds) {
    const record = await recordFromYaml(file, manifest);
    await writeFile(join(dir, `${record.id}.json`), JSON.stringify(record, null, 2));
    console.log(`Wrote seed ${record.id}`);
  }

  console.log('Seed entries written.');
}

main();
