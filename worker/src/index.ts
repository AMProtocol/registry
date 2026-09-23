/**
 * Cloudflare Worker: api.agent-manifest.com + validator.agent-manifest.com
 * Reads the built registry index bundled at deploy time.
 */

import indexData from '../data/index.json';

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
for (const e of (indexData as { entries: Record<string, unknown>[] }).entries ?? []) {
  entriesById.set(e.id as string, e);
  if (e.legacy_id) entriesById.set(e.legacy_id as string, e);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
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

const submissions = new Map<string, { status: string; listing_id?: string }>();

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/health') {
      return json({ status: 'healthy', service: 'agentmanifest-api', version: '0.3.0' });
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
      const id = `sub_${Date.now()}`;
      submissions.set(id, { status: 'approved', listing_id: 'pending-pr' });
      return json(
        {
          meta: { spec_version: 'agentmanifest-0.3' },
          data: {
            submission_id: id,
            status: 'pending',
            status_url: `/listings/submit/${id}/status`,
            message: 'Submission accepted. Open a PR via GitHub App (configure GITHUB_TOKEN).',
          },
        },
        202
      );
    }

    const statusMatch = path.match(/^\/listings\/submit\/([^/]+)\/status$/);
    if (statusMatch) {
      const sub = submissions.get(statusMatch[1]);
      if (!sub) return json({ error: 'Not found' }, 404);
      return json({
        meta: { spec_version: 'agentmanifest-0.3' },
        data: {
          submission_id: statusMatch[1],
          status: sub.status,
          listing_id: sub.listing_id,
          listing_url: sub.listing_id ? `/listings/${sub.listing_id}` : undefined,
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
      return json({ meta: { spec_version: 'agentmanifest-0.3' }, data: { categories, total_categories: categories.length } });
    }

    if (path === '/agents' || path === '/llms.txt') {
      return new Response('See https://api.agent-manifest.com/agents on Railway until cutover.', {
        headers: { 'content-type': 'text/plain' },
      });
    }

    if (path === '/validate' && request.method === 'POST') {
      return json({ error: 'Validator routes deploy on validator. custom domain (same Worker entry)' }, 501);
    }

    return json({ error: 'Not found', path }, 404);
  },
};
