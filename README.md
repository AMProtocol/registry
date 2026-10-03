# AMProtocol/registry

Public GitHub repo for the AMP registry **git index** (exports, PR checks, backups). **Production API** (`api.agent-manifest.com`) is the Railway registry service.

- `entries/<group>/<id>.json` — registry records in git (backup / CI)
- `entries/seed/` — **reference-only** example manifests ([readme](entries/seed/README.md)); **not** served by `api.agent-manifest.com`
- `sources/<id>.yaml` — hand-written overrides for OpenAPI imports
- `rules/` — shared validation (PR checks)
- `scripts/` — migrate, build index, build static site
- `worker/` — archived Cloudflare experiment (not deployed)

**List + submit:** `api.agent-manifest.com` on **Railway** (Postgres). **Validate:** `validator.agent-manifest.com` on Railway.

## Commands

```bash
npm install
npm run migrate          # from ../backups/registry-2026-09-23
npm run import-seeds     # regenerate entries/seed/ (illustrative, not production API)
npm run build            # public/registry/index.json + worker bundle
npm run verify           # re-validate all verified entries
```

## Submit an API

1. Validate at `https://validator.agent-manifest.com`
2. `POST https://api.agent-manifest.com/listings/submit` with `{"url":"https://your-api.com"}`  
   or `amp publish`

No Cloudflare Worker env vars required for production — same hostname as before the cutover experiment.
