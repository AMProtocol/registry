const LIVE_VALIDATOR = 'https://validator.agent-manifest.com';

export async function proxyValidate(request: Request): Promise<Response> {
  const body = await request.text();
  const res = await fetch(`${LIVE_VALIDATOR}/validate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });
}

export async function proxyValidateUrl(url: string) {
  const res = await fetch(`${LIVE_VALIDATOR}/validate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  return res.json() as Promise<{ passed: boolean; checks: Array<{ passed: boolean; severity: string; message: string }>; badges?: string[] }>;
}
