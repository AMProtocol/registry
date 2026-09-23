# Cutover checklist (manual — do not run until Worker contract tests pass)

## Staging

1. Deploy Worker to `api-next.agent-manifest.com` (wrangler custom domain).
2. Run `node scripts/contract-test.mjs --base https://api-next.agent-manifest.com` against live Railway API.
3. Fix any diffs except additive `status` / `last_valid` / `listing_url` fields (documented in `/changelog`).

## Final export

```bash
node ../agentmanifest/scripts/export-registry.mjs ../backups/registry-pre-cutover-$(date +%Y-%m-%d)
```

Merge any listings submitted since Phase 0 backup.

## DNS (Cloudflare)

1. Point `api.agent-manifest.com` and `validator.agent-manifest.com` to Worker custom domains.
2. Point apex `agent-manifest.com` to Cloudflare Pages (`public/` artifact).
3. Keep Railway DNS records noted for rollback.

## Same-day doc updates

- [ ] `agentmanifest/README.md`, `SETUP.md`, `llms.txt`
- [ ] `amp-cli/README.md`, `CHANGELOG.md`
- [ ] Landing page (`site/index.html` / agentmanifest-landing)
- [ ] `/agents` and `/llms.txt` on all three hosts

## Railway

Pause (do not delete) registry, validator, landing, Postgres. Snapshot DB; retain 30 days.
