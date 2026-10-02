# Production (Railway)

**User-facing API** — all on Railway, same as before the git/Worker experiment:

| Host | Service | Purpose |
|------|---------|---------|
| `api.agent-manifest.com` | Registry | Listings, submit, `/agents`, Postgres |
| `validator.agent-manifest.com` | Validator | `POST /validate`, schemas, JWT verification tokens |
| `agent-manifest.com` | Landing | Protocol site + hosted schemas |

**Spec / release:** revision **0.3.1** (`agentmanifest-0.3`). CLI: `@agentmanifest/cli@0.3.1` on npm.

**Not in the user path:** `worker/` in this repo (archived experiment; not deployed).

**Smoke test**

```bash
curl -s https://api.agent-manifest.com/health
curl -s https://validator.agent-manifest.com/health
curl -s -X POST https://validator.agent-manifest.com/validate \
  -H 'Content-Type: application/json' -d '{"url":"https://bakebase.agent-manifest.com"}' | jq .passed
npm i -g @agentmanifest/cli@0.3.1 && amp validate https://bakebase.agent-manifest.com
```

**Why the Worker detour happened**

Goal was to move **read-only** listings off Railway (cheaper at scale) while keeping submit on Postgres. That split `api` across Cloudflare + Railway, broke the mental model, and required env vars you never had before. Production is **back to one registry URL on Railway**; validator always stayed on Railway.
