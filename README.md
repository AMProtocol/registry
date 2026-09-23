# AMProtocol/registry

Public GitHub repo that is the **single source of truth** for the AMP registry.

- `entries/<group>/<id>.json` — one registry record per listing
- `sources/<id>.yaml` — hand-written overrides for OpenAPI imports
- `rules/` — shared validation (PR checks and API Worker)
- `scripts/` — migrate, import, build index, build static site
- `worker/` — Cloudflare Worker (`api.` and `validator.` custom domains)
- `site/` — landing page source merged into `public/` on build

## Commands

```bash
npm install
npm run migrate          # from ../backups/registry-2026-09-23
npm run import-seeds     # seven curated unverified APIs
npm run build            # public/registry/index.json + static site
npm run verify           # re-validate all verified entries
```

## Submit an API

- **API:** `POST https://api.agent-manifest.com/listings/submit`
- **PR:** open an issue with the "Add an API" template
- **CLI:** `amp publish` or `amp publish --pr`
