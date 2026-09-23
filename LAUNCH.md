# Launch checklist

## Release

- [ ] `npm publish` `@agentmanifest/validator@0.3.0` (requires npm login)
- [ ] `npm publish` `@agentmanifest/cli@0.3.0`
- [ ] Tag `AMP` repo `v0.3.1` and push `launch/v0.3.1`
- [ ] Push `AMProtocol/registry` and enable Pages + Worker

## Demo

Record Millennium Falcon demo:

```bash
amp find "how fast does the millennium falcon go"
```

(Requires SWAPI seed entry in registry.)

## Optional outreach

- Packrift (Farhan) — design partner
- Vend — x402 field validation in production
- D.O.A.I. — `freemium` now supported

## Measure

Cloudflare bot analytics baseline for `agent-manifest.com` (GPTBot, ClaudeBot, PerplexityBot).
