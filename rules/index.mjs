import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { MANIFEST_SCHEMAS, registryRecord } from './schemas.mjs';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const recordValidator = ajv.compile(registryRecord);
const manifestValidators = Object.fromEntries(
  Object.entries(MANIFEST_SCHEMAS).map(([v, s]) => [v, ajv.compile(s)])
);

export const MIGRATION_EXEMPT = new Set(['migration']);
export const MAX_LISTINGS_PER_PUBLISHER = 100;

/** RFC 8615: manifest always lives at the origin's well-known path. */
export function resolveManifestUrl(url) {
  const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return new URL('/.well-known/agent-manifest.json', withScheme).toString();
}

export function publisherGroup(record) {
  const contact = record.publisher?.contact ?? '';
  if (contact.includes('@')) {
    const domain = contact.split('@')[1]?.toLowerCase();
    if (domain) return domain.replace(/\./g, '-');
  }
  return record.publisher?.group ?? record.publisher?.domain?.replace(/\./g, '-') ?? 'unknown';
}

export function validateManifest(manifest) {
  const version = manifest?.spec_version;
  const validate = manifestValidators[version];
  if (!validate) {
    return { ok: false, errors: [`Unsupported spec_version: ${version}`] };
  }
  if (!validate(manifest)) {
    return {
      ok: false,
      errors: (validate.errors ?? []).map((e) => `${e.instancePath} ${e.message}`.trim()),
    };
  }
  return { ok: true, errors: [] };
}

export function validateRecord(record) {
  if (!recordValidator(record)) {
    return {
      ok: false,
      errors: (recordValidator.errors ?? []).map((e) => `${e.instancePath} ${e.message}`.trim()),
    };
  }
  if (record.manifest) {
    const m = validateManifest(record.manifest);
    if (!m.ok) return { ok: false, errors: m.errors };
  }
  return { ok: true, errors: [] };
}

/**
 * Rules for new submissions only. Migrated records (submitted_via: migration) are exempt.
 */
export function checkSubmissionRules(record, existingRecords) {
  const errors = [];
  const v = validateRecord(record);
  if (!v.ok) errors.push(...v.errors);

  if (MIGRATION_EXEMPT.has(record.submitted_via)) {
    return { ok: errors.length === 0, errors };
  }

  const manifestUrl = record.manifest_url ?? (record.url ? resolveManifestUrl(record.url) : null);
  if (manifestUrl) {
    const dup = existingRecords.find(
      (r) => r.id !== record.id && (r.manifest_url === manifestUrl || resolveManifestUrl(r.url ?? '') === manifestUrl)
    );
    if (dup) errors.push(`Duplicate manifest_url (existing id: ${dup.id})`);
  }

  const group = publisherGroup(record);
  const count = existingRecords.filter(
    (r) => r.id !== record.id && publisherGroup(r) === group && !MIGRATION_EXEMPT.has(r.submitted_via)
  ).length;
  if (count >= MAX_LISTINGS_PER_PUBLISHER) {
    errors.push(`Publisher group "${group}" exceeds cap of ${MAX_LISTINGS_PER_PUBLISHER} new submissions`);
  }

  return { ok: errors.length === 0, errors };
}
