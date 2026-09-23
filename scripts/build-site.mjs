#!/usr/bin/env node
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const landing = join(root, '..', 'agentmanifest-landing', 'index.html');

async function main() {
  const pub = join(root, 'public');
  await mkdir(pub, { recursive: true });

  try {
    await cp(landing, join(pub, 'index.html'));
  } catch {
    console.warn('Landing page not found; skipping index.html copy');
  }

  const index = JSON.parse(await readFile(join(pub, 'registry', 'index.json'), 'utf8'));

  for (const record of index.entries) {
    const m = record.manifest ?? {};
    const pageDir = join(pub, 'apis', record.id);
    await mkdir(pageDir, { recursive: true });
    const statusBadge = record.status;
    const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/>
<title>${m.name ?? record.id} — AMP Registry</title>
<link rel="ard" href="/.well-known/ard.json"/>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebAPI', name: m.name, description: m.description, url: record.url })}</script>
</head><body>
<h1>${m.name ?? record.id}</h1>
<p><strong>Status:</strong> ${statusBadge}</p>
${record.status === 'lapsed' && record.last_valid ? `<p>Last valid under ${record.last_valid.spec_version} on ${record.last_valid.validated_at}</p>` : ''}
${record.status === 'unverified' ? `<p><em>Auto-generated from public docs, not endorsed by ${record.publisher?.domain ?? 'the provider'}.</em></p>` : ''}
<p>${m.description ?? ''}</p>
<h2>Claim this API</h2>
<p>Publish <code>/.well-known/agent-manifest.json</code> on your domain and <a href="https://github.com/AMProtocol/registry/issues/new?template=add-api.yml">submit via GitHub</a> or run <code>amp publish</code>.</p>
<h2>Correct or remove</h2>
<p><a href="https://github.com/AMProtocol/registry/issues/new?template=correct-listing.yml">Open an issue</a> to correct or request removal.</p>
<pre>${JSON.stringify(record.manifest, null, 2)}</pre>
</body></html>`;
    await writeFile(join(pageDir, 'index.html'), html);
  }

  const schemaRoot = join(root, '..', 'agentmanifest', 'spec', 'schemas');
  for (const ver of ['v0.2', 'v0.3']) {
    const dest = join(pub, 'schemas', ver);
    await mkdir(dest, { recursive: true });
    await cp(join(schemaRoot, ver, 'manifest.json'), join(dest, 'manifest.json'));
  }
  await cp(
    join(root, '..', 'agentmanifest', 'spec', 'registry-record.schema.json'),
    join(pub, 'schemas', 'registry-record.json')
  );

  await writeFile(
    join(pub, 'changelog.md'),
    `# Changelog\n\n## 2026-09-23\n\n- Registry launch on GitHub + Cloudflare Worker\n- Spec revision 0.3.1 (freemium, unknown pricing, x402)\n- API responses add \`status\` and \`last_valid\` alongside existing fields\n`
  );

  await writeFile(
    join(pub, 'llms.txt'),
    `# Agent Manifest Protocol Registry\n\n> Public index of verified and imported APIs.\n\n- [All listings](/registry/index.json)\n- [Agent guidance](https://api.agent-manifest.com/agents)\n`
  );

  await writeFile(join(pub, 'robots.txt'), `User-agent: *\nAllow: /\n\n# ARD\nSitemap: https://agent-manifest.com/sitemap.xml\n`);

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${index.entries.map((e) => `  <url><loc>https://agent-manifest.com/apis/${e.id}/</loc></url>`).join('\n')}
</urlset>`;
  await writeFile(join(pub, 'sitemap.xml'), sitemap);

  console.log(`Built ${index.entries.length} API pages`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
