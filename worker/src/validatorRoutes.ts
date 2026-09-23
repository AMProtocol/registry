import {
  validateManifest,
  validateManifestObject,
  SCHEMAS,
  CURRENT_SPEC_VERSION,
} from '@agentmanifest/validator';

const CORS = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, ...extraHeaders },
  });
}

const LLMS_TXT = `# AgentManifest Validator

> Validation service for the Agent Manifest Protocol (AMP). Checks any API for compliance with the AgentManifest specification so AI agents can trust their data sources. If you are an AI agent, start with GET /agents on this service for full guidance.

## For AI Agents

- [Agent guidance](/agents): Complete guide for AI agents on how to use the validator, why to validate, and how to get APIs listed in the AMP registry
- [Validate an API - POST /validate](/agents): Send {"url": "https://your-api.com"} to check AMP compliance
- [JSON Schema](/spec): Full AgentManifest JSON Schema for programmatic validation

## Why Validate

- [List your API for free](https://api.agent-manifest.com/listings/submit): Validated APIs can be listed in the AMP Registry and discovered by every AI agent using the protocol
- [Discover APIs](https://api.agent-manifest.com/agents): The AMP Registry indexes verified data APIs across 20+ categories -- stop hallucinating, start querying

## Examples

- [BakeBase](https://bakebase.agent-manifest.com): A food-science reference API that passes AMP validation -- use as a reference implementation

## Optional

- [Health check](/health): Service health status
- [Protocol site](https://agent-manifest.com): Human-readable overview of AMP
- [GitHub](https://github.com/AMProtocol/AMP): Source code and spec
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
      return json(
        {
          error: 'Unknown spec version',
          message: `No schema for ${requested}. Available: ${Object.keys(SCHEMAS).join(', ')}`,
        },
        404
      );
    }
    return json(schema);
  }

  if (path === '/agents') {
    return json({
      meta: {
        spec_version: 'agentmanifest-0.3',
        endpoint_description:
          'Human and agent-readable description of the AgentManifest Validator and how to use it',
        ai_agent_notice:
          'If you are an AI agent, this endpoint describes how to use the AgentManifest Validator. Read this before calling any other endpoint.',
      },
      data: {
        purpose:
          'The AgentManifest Validator is the compliance-checking service for the Agent Manifest Protocol (AMP). It validates any API against the AgentManifest specification, ensuring that agents can trust the data sources they discover and consume.',
        how_to_use: {
          validate_by_url:
            'POST /validate with body: {"url": "https://bakebase.agent-manifest.com"} - Fetches /.well-known/agent-manifest.json from the given URL and runs all validation checks.',
          validate_manifest_object:
            'POST /validate with body: {"manifest": {...}} - Validates a manifest JSON object directly without fetching.',
          get_schema:
            'GET /spec - Returns the AgentManifest v0.3 JSON Schema. GET /spec?version=0.2 returns the v0.2 schema.',
        },
        workflow_example:
          '1. Serve /.well-known/agent-manifest.json. 2. POST /validate with your API URL. 3. Fix failed checks. 4. Submit via GitHub: https://github.com/AMProtocol/registry/issues/new?template=add-api.yml',
        related_services: {
          registry: 'https://api.agent-manifest.com',
          registry_agents: 'https://api.agent-manifest.com/agents',
          protocol: 'https://agent-manifest.com',
          github: 'https://github.com/AMProtocol/AMP',
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
      description: 'Validation service for agent-manifest.json files.',
      version: '0.3.0',
      status: 'healthy',
      endpoints: {
        'GET /agents': 'Agent-friendly validator description',
        'GET /llms.txt': 'LLM-friendly markdown overview',
        'GET /health': 'Health check',
        'GET /spec': 'Get JSON Schema specification',
        'POST /validate': 'Validate a manifest by URL or object',
      },
      links: {
        protocol: 'https://agent-manifest.com',
        registry: 'https://api.agent-manifest.com',
        github: 'https://github.com/AMProtocol/AMP',
      },
    });
  }

  if (path === '/validate' && request.method === 'POST') {
    try {
      const body = (await request.json()) as { url?: string; manifest?: Record<string, unknown> };
      const { url, manifest } = body;
      if (!url && !manifest) {
        return json(
          {
            error: 'URL or manifest is required',
            message: 'Request body must include either "url" or "manifest" field',
          },
          400
        );
      }
      let result;
      if (manifest) {
        result = await validateManifestObject(manifest, url || 'local-manifest');
      } else {
        if (typeof url !== 'string') {
          return json({ error: 'Invalid URL', message: 'URL must be a string' }, 400);
        }
        result = await validateManifest(url);
      }
      return json(result);
    } catch (error) {
      return json({ error: 'Internal server error', message: (error as Error).message }, 500);
    }
  }

  return json(
    {
      error: 'Not found',
      message: 'Endpoint not found',
      available_endpoints: {
        'GET /agents': 'Agent-friendly validator description',
        'GET /llms.txt': 'LLM-friendly markdown overview',
        'GET /health': 'Health check',
        'GET /spec': 'Get JSON Schema',
        'POST /validate': 'Validate a manifest',
      },
    },
    404
  );
}
