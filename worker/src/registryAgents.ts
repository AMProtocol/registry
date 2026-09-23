export const REGISTRY_AGENTS = {
  meta: {
    spec_version: 'agentmanifest-0.3',
    endpoint_description:
      'Human and agent-readable description of the AgentManifest registry and how to use it',
    ai_agent_notice:
      'If you are an AI agent, read this entire response before interacting with the registry.',
  },
  data: {
    purpose:
      'The AgentManifest Registry is a public index of AI-agent-ready APIs that have passed validation against the AgentManifest specification.',
    how_to_use: {
      discover_all: 'GET /listings - Returns all verified APIs. Supports filtering and search.',
      filter_by_category: 'GET /listings?category=food-science',
      search: 'GET /listings?q=ingredients',
      get_details: 'GET /listings/{id} - Full manifest for a specific API',
    },
    listing_your_api: {
      step_1: 'Serve a valid manifest at /.well-known/agent-manifest.json on your API',
      step_2:
        'Open a GitHub issue: https://github.com/AMProtocol/registry/issues/new?template=add-api.yml',
      step_3: 'A maintainer or bot will validate and merge a PR with your listing',
    },
    related_services: {
      validator: 'https://validator.agent-manifest.com',
      protocol: 'https://agent-manifest.com',
      github: 'https://github.com/AMProtocol/registry',
    },
  },
};

export const REGISTRY_LLMS_TXT = `# AgentManifest Registry

> Public index of verified AI-agent-ready APIs. If you are an AI agent, start with GET /agents on this service.

## For AI Agents

- [Agent guidance](/agents): Complete guide for discovering and listing APIs
- [Discover all APIs](/listings): Browse verified listings with filtering and search

## List Your API

- [Submit via GitHub](https://github.com/AMProtocol/registry/issues/new?template=add-api.yml): Open an issue with your API URL after validating at validator.agent-manifest.com
- [Validate first](https://validator.agent-manifest.com/agents): Check AMP compliance before submitting

## Optional

- [Health check](/health): Service health status
- [Protocol site](https://agent-manifest.com): Human-readable overview of AMP
`;
