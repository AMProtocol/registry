# Launch checklist (Railway production)

## Release — done

- [x] `@agentmanifest/cli@0.3.1` on npm (remote validate only)
- [x] AMP repo tag `v0.3.1` on `main`
- [x] `api.agent-manifest.com` + `validator.agent-manifest.com` → Railway
- [x] Worker staging hostname removed; no Worker deploy workflow

## Optional

- [ ] GitHub Pages (`Deploy Pages` workflow) — static browse mirror only
- [ ] `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` — Pages only, not API

## Demo

```bash
npm install -g @agentmanifest/cli@0.3.1
amp validate https://bakebase.agent-manifest.com
amp find "baking ingredients"
```

See `PRODUCTION.md` for smoke tests and architecture.
