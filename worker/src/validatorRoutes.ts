import v02 from '../../schemas/v0.2/manifest.json';
import v03 from '../../schemas/v0.3/manifest.json';
import { proxyValidate } from './validateProxy';

const CORS = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
const SCHEMAS: Record<string, unknown> = {
  'agentmanifest-0.2': v02,
  'agentmanifest-0.3': v03,
};
const CURRENT_SPEC_VERSION = 'agentmanifest-0.3';

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, ...extraHeaders },
  });
}

const LLMS_TXT = `# AgentManifest Validator

> Validation service for the Agent Manifest Protocol (AMP).

## For AI Agents

- [Agent guidance](/agents): How to validate and list APIs
- [Validate - POST /validate](/agents): {"url": "https://your-api.com"}
- [JSON Schema](/spec): AgentManifest JSON Schema

## Optional

- [Health check](/health)
- [Protocol site](https://agent-manifest.com)
`;

export async function handleValidatorRequest(
  request: Request,
  path: string,
  searchParams: URLSearchParams
): Promise<Response> {
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
    return json({
      status: 'healthy',
      service: 'agentmanifest-validator',
      version: '0.3.0',
      timestamp: new Date().toISOString(),
    });
  }

  if (path === '/spec') {
    const requested = searchParams.get('version')
      ? `agentmanifest-${String(searchParams.get('version')).replace(/^v/, '')}`
      : CURRENT_SPEC_VERSION;
    const schema = SCHEMAS[requested];
    if (!schema) {
      return json({ error: 'Unknown spec version', message: `No schema for ${requested}` }, 404);
    }
    return json(schema);
  }

  if (path === '/agents') {
    return json({
      meta: { spec_version: 'agentmanifest-0.3' },
      data: {
        purpose: 'AMP compliance validation for agent-manifest.json files.',
        how_to_use: {
          validate_by_url: 'POST /validate with {"url": "https://your-api.com"}',
          validate_manifest_object: 'POST /validate with {"manifest": {...}}',
          get_schema: 'GET /spec',
        },
        related_services: {
          registry: 'https://api.agent-manifest.com',
          protocol: 'https://agent-manifest.com',
        },
      },
    });
  }

  if (path === '/llms.txt') {
    return new Response(LLMS_TXT, {
      headers: { 'content-type': 'text/markdown; charset=utf-8', 'access-control-allow-origin': '*' },
    });
  }

  if (path === '/' && request.method === 'GET') {
    return json({
      service: 'AgentManifest Validator',
      version: '0.3.0',
      endpoints: { 'POST /validate': 'Validate manifest', 'GET /spec': 'JSON Schema', 'GET /agents': 'Usage guide' },
    });
  }

  if (path === '/validate' && request.method === 'POST') {
    return proxyValidate(request);
  }

  return json({ error: 'Not found', message: 'Endpoint not found' }, 404);
}
