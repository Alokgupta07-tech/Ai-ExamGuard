const SECRET_KEY_PATTERN =
  /(secret|password|private[-_]?key|api[-_]?key|access[-_]?token|refresh[-_]?token|id[-_]?token|bearer|client[-_]?secret|signing[-_]?key|webhook[-_]?secret|cert(ificate)?[-_]?key|hmac|passphrase|credential)/i;

export interface RedactedSecretField {
  key: string;
  configured: boolean;
  fingerprint: string;
}

export interface SanitizedConfigResult {
  sanitizedConfig: Record<string, unknown>;
  secretSummary: RedactedSecretField[];
  hasConfiguredSecrets: boolean;
}

export function isSensitiveConfigKey(key: string): boolean {
  return SECRET_KEY_PATTERN.test(key);
}

export function maskSecretValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return 'empty';
  if (trimmed.length <= 6) return '••••••';
  return `••••${trimmed.slice(-4)}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeRecursive(
  node: unknown,
  pathPrefix: string,
  secretSummary: RedactedSecretField[]
): unknown {
  if (Array.isArray(node)) {
    return node.map((item, idx) => sanitizeRecursive(item, `${pathPrefix}[${idx}]`, secretSummary));
  }

  if (!isPlainObject(node)) {
    return node;
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(node)) {
    const fullKey = pathPrefix ? `${pathPrefix}.${key}` : key;

    if (key === '_secretMeta' && Array.isArray(val)) {
      for (const entry of val) {
        if (
          isPlainObject(entry) &&
          typeof entry.key === 'string' &&
          typeof entry.fingerprint === 'string'
        ) {
          secretSummary.push({
            key: entry.key,
            configured: Boolean(entry.configured ?? true),
            fingerprint: entry.fingerprint,
          });
        }
      }
      continue;
    }

    if (key === '_secrets' && isPlainObject(val)) {
      for (const [sKey, sVal] of Object.entries(val)) {
        if (typeof sVal === 'string' && sVal.trim().length > 0) {
          secretSummary.push({
            key: sKey,
            configured: true,
            fingerprint: maskSecretValue(sVal),
          });
        }
      }
      continue;
    }

    if (isSensitiveConfigKey(key)) {
      if (typeof val === 'string' && val.trim().length > 0) {
        secretSummary.push({
          key: fullKey,
          configured: true,
          fingerprint: maskSecretValue(val),
        });
      } else if (val !== null && val !== undefined && val !== '') {
        secretSummary.push({
          key: fullKey,
          configured: true,
          fingerprint: '••••••',
        });
      }
      continue;
    }

    out[key] = sanitizeRecursive(val, fullKey, secretSummary);
  }

  return out;
}

/**
 * Strips every secret-like field from raw integration configuration JSONB before
 * any payload leaves the server. Returns safe non-secret settings plus redacted
 * fingerprints only.
 */
export function sanitizeIntegrationConfig(
  rawConfig: Record<string, unknown> | null | undefined
): SanitizedConfigResult {
  if (!rawConfig || !isPlainObject(rawConfig)) {
    return {
      sanitizedConfig: {},
      secretSummary: [],
      hasConfiguredSecrets: false,
    };
  }

  const secretSummary: RedactedSecretField[] = [];
  const sanitized = sanitizeRecursive(rawConfig, '', secretSummary);
  const sanitizedConfig = isPlainObject(sanitized) ? sanitized : {};

  // Deduplicate secret summary by key, keeping the latest metadata
  const deduped = new Map<string, RedactedSecretField>();
  for (const item of secretSummary) {
    deduped.set(item.key, item);
  }

  const mergedSummary = Array.from(deduped.values());
  return {
    sanitizedConfig,
    secretSummary: mergedSummary,
    hasConfiguredSecrets: mergedSummary.some((s) => s.configured),
  };
}

/**
 * Merges updated public connector config with server-side secret inputs without
 * overwriting previously saved secrets if omitted on edit, and without placing
 * plaintext secrets inside public properties.
 */
export function mergeIntegrationConfigForStorage(params: {
  existingRawConfig: Record<string, unknown> | null | undefined;
  publicConfig: Record<string, unknown>;
  secretInputs?: Record<string, string>;
}): Record<string, unknown> {
  const existing = isPlainObject(params.existingRawConfig) ? params.existingRawConfig : {};
  const existingSecrets = isPlainObject(existing._secrets) ? { ...existing._secrets } : {};

  // Migrate any legacy top-level sensitive keys into _secrets and keep sanitized top-level keys
  for (const [key, val] of Object.entries(existing)) {
    if (key === '_secrets' || key === '_secretMeta') continue;
    if (isSensitiveConfigKey(key) && typeof val === 'string' && val.trim().length > 0) {
      existingSecrets[key] = val.trim();
    }
  }

  if (params.secretInputs) {
    for (const [key, rawVal] of Object.entries(params.secretInputs)) {
      const trimmed = typeof rawVal === 'string' ? rawVal.trim() : '';
      if (trimmed.length > 0) {
        existingSecrets[key] = trimmed;
      }
    }
  }

  const sanitizedPublic = sanitizeIntegrationConfig(params.publicConfig).sanitizedConfig;

  const secretMeta: RedactedSecretField[] = Object.entries(existingSecrets)
    .filter(([, val]) => typeof val === 'string' && val.trim().length > 0)
    .map(([key, val]) => ({
      key,
      configured: true,
      fingerprint: maskSecretValue(String(val)),
    }));

  const stored: Record<string, unknown> = {
    ...sanitizedPublic,
    _secretMeta: secretMeta,
  };

  if (Object.keys(existingSecrets).length > 0) {
    stored._secrets = existingSecrets;
  }

  return stored;
}

