/**
 * POST /listings/submit and status polling stay on Railway (Postgres-backed registry).
 * Reads/listings are served from the Worker bundle.
 */

export interface RegistryEnv {
  REGISTRY_UPSTREAM?: string;
}

function upstreamBase(env: RegistryEnv): string | null {
  const base = env.REGISTRY_UPSTREAM?.trim();
  if (!base) return null;
  return base.replace(/\/$/, '');
}

export async function proxyRegistrySubmit(
  request: Request,
  path: string,
  env: RegistryEnv
): Promise<Response> {
  const base = upstreamBase(env);
  if (!base) {
    return new Response(
      JSON.stringify({
        error: 'Registry submit unavailable',
        message:
          'Set REGISTRY_UPSTREAM on the Worker to your Railway registry URL (e.g. https://….up.railway.app). Validator remains on validator.agent-manifest.com.',
      }),
      { status: 503, headers: { 'content-type': 'application/json' } }
    );
  }

  const incoming = new URL(request.url);
  const target = `${base}${path}${incoming.search}`;
  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  const res = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
  });

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    statusText: res.statusText,
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/json',
      'access-control-allow-origin': '*',
    },
  });
}
