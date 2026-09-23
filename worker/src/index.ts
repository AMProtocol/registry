/**
 * Cloudflare Worker: api.agent-manifest.com + validator.agent-manifest.com
 */

import indexData from '../data/index.json';
import { handleValidatorRequest } from './validatorRoutes';
import { REGISTRY_AGENTS, REGISTRY_LLMS_TXT } from './registryAgents';
import { validateManifest } from '@agentmanifest/validator';

const ISSUE_URL = 'https://github.com/AMProtocol/registry/issues/new?template=add-api.yml';

interface ListingRow {
  id: string;
  legacy_id?: string | null;
  name: string;
  url: string;
  description: string;
  primary_category?: string;
  categories?: string[];
  pricing_model?: string;
  payment_model?: string | null;
  payment_currency?: string | null;
  settlement_type?: string | null;
  supports_spend_cap?: boolean | null;
  auth_required?: boolean;
  maintained_by?: string;
  badges?: string[];
  status?: string;
  verified_at?: string;
  last_checked_at?: string;
  last_valid?: unknown;
  listing_url?: string;
}

const listings: ListingRow[] = (indexData as { listings: ListingRow[] }).listings ?? [];
const entriesById = new Map<string, Record<string, unknown>>();
const entriesByUrl = new Map<string, Record<string, unknown>>();
for (const e of (indexData as { entries: Record<string, unknown>[] }).entries ?? []) {
  entriesById.set(e.id as string, e);
  if (e.legacy_id) entriesById.set(e.legacy_id as string, e);
  if (typeof e.url === 'string') entriesByUrl.set(normalizeUrl(e.url), e);
}

function normalizeUrl(u: string) {
  try {
    const parsed = new URL(u.startsWith('http') ? u : `https://${u}`);
    return parsed.origin + parsed.pathname.replace(/\/$/, '');
  } catch {
    return u.replace(/\/$/, '');
  }
}

function json(data: unknown, status = 200, contentType = 'application/json') {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': contentType, 'access-control-allow-origin': '*' },
  });
}

function filterListings(params: URLSearchParams): ListingRow[] {
  let out = listings.filter((l) => l.status !== 'lapsed' || params.has('include_lapsed'));
  if (!params.has('include_lapsed')) {
    out = out.filter((l) => l.status === 'verified' || l.status === 'unverified' || !l.status);
  }

  const cat = params.get('category');
  if (cat) out = out.filter((l) => l.categories?.includes(cat));

  const primary = params.get('primary_category');
  if (primary) out = out.filter((l) => l.primary_category === primary);

  const pricing = params.get('pricing_model');
  if (pricing) out = out.filter((l) => l.pricing_model === pricing);

  const paymentModel = params.get('payment_model');
  if (paymentModel) out = out.filter((l) => l.payment_model === paymentModel);

  const currency = params.get('payment_currency');
  if (currency) out = out.filter((l) => l.payment_currency === currency);

  const settlement = params.get('settlement_type');
  if (settlement) out = out.filter((l) => l.settlement_type === settlement);

  const spendCap = params.get('supports_spend_cap');
  if (spendCap === 'true') out = out.filter((l) => l.supports_spend_cap === true);
  if (spendCap === 'false') out = out.filter((l) => l.supports_spend_cap === false);

  const auth = params.get('auth_required');
  if (auth === 'true') out = out.filter((l) => l.auth_required === true);
  if (auth === 'false') out = out.filter((l) => l.auth_required === false);

  const maint = params.get('maintained_by');
  if (maint) out = out.filter((l) => l.maintained_by === maint);

  if (params.get('free_only') === 'true') {
    out = out.filter((l) => l.pricing_model === 'free' || l.payment_model === 'free');
  }

  const badges = params.get('badges');
  if (badges) {
    const want = badges.split(',').map((b) => b.trim());
    out = out.filter((l) => want.every((b) => l.badges?.includes(b)));
  }

  const q = params.get('q');
  if (q) {
    const lower = q.toLowerCase();
    out = out.filter(
      (l) => l.name.toLowerCase().includes(lower) || l.description.toLowerCase().includes(lower)
    );
  }

  const sort = params.get('sort') ?? 'created_at';
  if (sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name));

  const limit = Math.min(parseInt(params.get('limit') ?? '100', 10), 500);
  const offset = parseInt(params.get('offset') ?? '0', 10);
  return out.slice(offset, offset + limit);
}

const submissions = new Map<
  string,
  { status: string; url: string; listing_id?: string; error?: string; created_at: string }
>();

async function handleApiRequest(request: Request, path: string, url: URL): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'Content-Type',
      },
    });
  }

  if (path === '/health') {
    return json({ status: 'healthy', service: 'agentmanifest-api', version: '0.3.0' });
  }

  if (path === '/agents') {
    return json(REGISTRY_AGENTS);
  }

  if (path === '/llms.txt') {
    return new Response(REGISTRY_LLMS_TXT, {
      headers: { 'content-type': 'text/markdown; charset=utf-8', 'access-control-allow-origin': '*' },
    });
  }

  if (path === '/' && request.method === 'GET') {
    return json({
      service: 'AgentManifest Registry API',
      version: '0.3.0',
      endpoints: {
        'GET /listings': 'Browse verified APIs',
        'GET /listings/{id}': 'Get listing with full manifest',
        'GET /categories': 'Category counts',
        'POST /listings/submit': 'Validate and get submission instructions',
        'GET /agents': 'Agent usage guide',
      },
      links: { protocol: 'https://agent-manifest.com', github: 'https://github.com/AMProtocol/registry' },
    });
  }

  if (path === '/listings' && request.method === 'GET') {
    const filtered = filterListings(url.searchParams);
    return json({
      meta: { spec_version: 'agentmanifest-0.3', endpoint_description: 'Verified and imported APIs' },
      data: { count: filtered.length, listings: filtered },
    });
  }

  const listingMatch = path.match(/^\/listings\/([^/]+)$/);
  if (listingMatch && request.method === 'GET') {
    const entry = entriesById.get(listingMatch[1]);
    if (!entry) return json({ error: 'Not found' }, 404);
    const m = (entry.manifest ?? {}) as Record<string, unknown>;
    const pricing = m.pricing as { model?: string } | undefined;
    const payment = m.payment as Record<string, unknown> | undefined;
    const auth = m.authentication as { required?: boolean } | undefined;
    const rel = m.reliability as { maintained_by?: string } | undefined;
    return json({
      meta: { spec_version: 'agentmanifest-0.3' },
      data: {
        id: entry.id,
        name: m.name,
        url: entry.url,
        description: m.description,
        primary_category: m.primary_category,
        categories: m.categories,
        pricing_model: pricing?.model,
        payment_model: payment?.model ?? null,
        payment_currency: payment?.currency ?? null,
        settlement_type: (payment?.settlement as { type?: string })?.type ?? null,
        supports_spend_cap: (payment?.budget_controls as { supports_spend_cap?: boolean })?.supports_spend_cap ?? null,
        auth_required: auth?.required ?? false,
        maintained_by: rel?.maintained_by ?? 'individual',
        contact: (entry.publisher as { contact?: string })?.contact,
        manifest: entry.manifest,
        badges: entry.badges ?? [],
        status: entry.status,
        last_valid: entry.last_valid,
        check_status: entry.status === 'verified' ? 'verified' : entry.status,
        verified_at: entry.verified_at,
        last_checked_at: entry.last_checked_at,
        created_at: entry.created_at,
        updated_at: entry.last_checked_at,
      },
    });
  }

  if (path === '/listings/submit' && request.method === 'POST') {
    try {
      const body = (await request.json()) as { url?: string };
      if (!body.url) {
        return json({ error: 'URL is required', message: 'Request body must include "url" field' }, 400);
      }
      const normalized = normalizeUrl(body.url);
      const existing = entriesByUrl.get(normalized);
      if (existing) {
        return json(
          {
            error: 'Already listed',
            message: 'This API is already in the registry',
            listing_id: existing.id,
          },
          409
        );
      }

      const submissionId = `sub_${Date.now()}`;
      submissions.set(submissionId, {
        status: 'validating',
        url: body.url,
        created_at: new Date().toISOString(),
      });

      const validation = await validateManifest(body.url);
      const sub = submissions.get(submissionId)!;
      if (!validation.passed) {
        sub.status = 'failed';
        sub.error = validation.checks
          .filter((c) => !c.passed && c.severity === 'error')
          .map((c) => c.message)
          .join('; ');
        return json(
          {
            meta: { spec_version: 'agentmanifest-0.3' },
            data: {
              submission_id: submissionId,
              status: 'failed',
              status_url: `/listings/submit/${submissionId}/status`,
              message: sub.error,
              issue_url: ISSUE_URL,
            },
          },
          422
        );
      }

      sub.status = 'pending_pr';
      return json(
        {
          meta: { spec_version: 'agentmanifest-0.3' },
          data: {
            submission_id: submissionId,
            status: 'pending_pr',
            status_url: `/listings/submit/${submissionId}/status`,
            message:
              'Validation passed. Open a GitHub issue to add this API to the registry (or use amp publish --pr).',
            issue_url: ISSUE_URL,
            badges: validation.badges,
          },
        },
        202
      );
    } catch (error) {
      return json({ error: 'Internal server error', message: (error as Error).message }, 500);
    }
  }

  const statusMatch = path.match(/^\/listings\/submit\/([^/]+)\/status$/);
  if (statusMatch) {
    const sub = submissions.get(statusMatch[1]);
    if (!sub) return json({ error: 'Not found' }, 404);
    return json({
      meta: { spec_version: 'agentmanifest-0.3' },
      data: {
        submission_id: statusMatch[1],
        url: sub.url,
        status: sub.status,
        listing_id: sub.listing_id,
        listing_url: sub.listing_id ? `/listings/${sub.listing_id}` : undefined,
        error: sub.error,
        issue_url: ISSUE_URL,
        created_at: sub.created_at,
      },
    });
  }

  if (path === '/categories') {
    const counts = new Map<string, number>();
    for (const l of listings) {
      for (const c of l.categories ?? []) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    const categories = [...counts.entries()].map(([category, count]) => ({ category, count }));
    categories.sort((a, b) => b.count - a.count);
    return json({
      meta: { spec_version: 'agentmanifest-0.3' },
      data: { categories, total_categories: categories.length },
    });
  }

  return json({ error: 'Not found', path }, 404);
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const isValidator =
      url.hostname.includes('validator') ||
      path === '/validate' ||
      path === '/spec' ||
      (path === '/health' && url.searchParams.get('service') === 'validator');

    if (isValidator && !url.hostname.includes('api.')) {
      return handleValidatorRequest(request, path, url.searchParams);
    }

    return handleApiRequest(request, path, url);
  },
};
