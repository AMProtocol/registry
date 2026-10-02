# AMProtocol/registry

Public GitHub repo that is the **single source of truth** for the AMP registry index (read path on Cloudflare Worker).

- `entries/<group>/<id>.json` — one registry record per listing
- `sources/<id>.yaml` — hand-written overrides for OpenAPI imports
- `rules/` — shared validation (PR checks)
- `scripts/` — migrate, build index, build static site
- `worker/` — Cloudflare Worker (`api.agent-manifest.com` listings read API)

**Submit / Postgres:** `POST /listings/submit` is proxied to the **Railway registry** service (`REGISTRY_UPSTREAM` Worker variable). **Validate:** `validator.agent-manifest.com` on Railway.

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

Set **REGISTRY_UPSTREAM** on the Worker to your Railway registry public URL.
