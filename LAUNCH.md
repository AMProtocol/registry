# Launch checklist

## Release

- [x] `npm publish` `@agentmanifest/cli@0.3.1` (single package — no separate validator on npm)
- [ ] Tag `AMP` repo `v0.3.1` and merge `launch/v0.3.1` → `main`
- [ ] Push `AMProtocol/registry` with Worker + Pages workflows
- [ ] Set GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- [ ] Set Cloudflare Worker secret: `wrangler secret put JWT_SECRET` (for validation tokens)

## Staging

1. Deploy Worker to `api-next.agent-manifest.com` (custom domain in Cloudflare).
2. Run `npm run contract-test -- --base https://api-next.agent-manifest.com`.
3. Fix any diffs (see `CUTOVER.md`).

## Demo

```bash
npm install -g @agentmanifest/cli
amp find "how fast does the millennium falcon go"
```

(Requires SWAPI seed entry live on the new API.)

## Cutover

See `CUTOVER.md` — DNS swap, docs, pause Railway.

## Measure

Cloudflare bot analytics baseline for `agent-manifest.com` (GPTBot, ClaudeBot, PerplexityBot).
