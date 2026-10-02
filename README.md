# AMProtocol/registry

Public GitHub repo for the AMP registry **git index** (used for Pages / optional Worker staging). **Production API** (`api.agent-manifest.com`) is the Railway registry service.

- `entries/<group>/<id>.json` — one registry record per listing
- `sources/<id>.yaml` — hand-written overrides for OpenAPI imports
- `rules/` — shared validation (PR checks)
- `scripts/` — migrate, build index, build static site
- `worker/` — Cloudflare Worker (optional staging: `api-next.agent-manifest.com`; production API is Railway)

**List + submit:** `api.agent-manifest.com` on **Railway** (Postgres). **Validate:** `validator.agent-manifest.com` on Railway.

## Commands

```bash
npm install
npm run migrate          # from ../backups/registry-2026-09-23
npm run import-seeds     # seven curated unverified APIs
npm run build            # public/registry/index.json + worker bundle
npm run verify           # re-validate all verified entries
```

## Submit an API

1. Validate at `https://validator.agent-manifest.com`
2. `POST https://api.agent-manifest.com/listings/submit` with `{"url":"https://your-api.com"}`  
   or `amp publish`

No Cloudflare Worker env vars required for production — same hostname as before the cutover experiment.
