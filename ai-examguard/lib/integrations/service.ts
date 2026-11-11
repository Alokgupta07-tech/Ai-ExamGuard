import { supabaseAdmin } from '@/lib/supabase/admin';
import type { IntegrationConfigView } from '@/types/dashboard';
import {
  INTEGRATION_PROTOCOL_CONTRACTS,
  type IntegrationContractSpec,
  type IntegrationProtocolId,
  type IntegrationType,
} from '@/lib/integrations/contracts';
import {
  mergeIntegrationConfigForStorage,
  sanitizeIntegrationConfig,
  type RedactedSecretField,
} from '@/lib/integrations/secret-sanitizer';

export interface SanitizedIntegrationConnector {
  id: string;
  integrationType: IntegrationType;
  providerName: string;
  protocol: IntegrationProtocolId | null;
  isActive: boolean;
  publicConfig: Record<string, unknown>;
  configSummary: string;
  secretStatus: {
    hasConfiguredSecrets: boolean;
    fields: RedactedSecretField[];
    exposed: false;
  };
  updatedAt: string;
}

export interface TenantIntegrationState {
  independentMode: boolean;
  externalDependencyRequired: boolean;
  modeDescription: string;
  secretProtectionPolicy: string;
  connectors: SanitizedIntegrationConnector[];
  contracts: IntegrationContractSpec[];
}

interface RawIntegrationRow {
  id: string;
  integration_type: IntegrationType;
  provider_name: string;
  is_active: boolean;
  config: Record<string, unknown> | null;
  updated_at: string;
}

function inferProtocolFromRow(row: RawIntegrationRow): IntegrationProtocolId | null {
  const rawProtocol = row.config?.protocol;
  if (
    rawProtocol === 'lti_1_3' ||
    rawProtocol === 'oidc' ||
    rawProtocol === 'saml_2_0' ||
    rawProtocol === 'rest_api' ||
    rawProtocol === 'webhooks' ||
    rawProtocol === 'qti_exchange'
  ) {
    return rawProtocol;
  }

  switch (row.integration_type) {
    case 'lms':
      return 'lti_1_3';
    case 'sso':
      return 'oidc';
    case 'analytics':
      return 'rest_api';
    case 'notification':
      return 'webhooks';
    case 'storage':
      return 'qti_exchange';
    default:
      return null;
  }
}

export function toSanitizedConnector(row: RawIntegrationRow): SanitizedIntegrationConnector {
  const { sanitizedConfig, secretSummary, hasConfiguredSecrets } = sanitizeIntegrationConfig(
    row.config
  );
  const endpoint =
    typeof sanitizedConfig.endpoint === 'string' && sanitizedConfig.endpoint.trim().length > 0
      ? sanitizedConfig.endpoint.trim()
      : null;

  return {
    id: row.id,
    integrationType: row.integration_type,
    providerName: row.provider_name,
    protocol: inferProtocolFromRow(row),
    isActive: row.is_active,
    publicConfig: sanitizedConfig,
    configSummary: endpoint || 'Independent Contract Configured',
    secretStatus: {
      hasConfiguredSecrets,
      fields: secretSummary,
      exposed: false,
    },
    updatedAt: row.updated_at,
  };
}

export function toDashboardIntegrationViews(
  rows: RawIntegrationRow[] | null | undefined
): IntegrationConfigView[] {
  return (rows || []).map((row) => {
    const clean = toSanitizedConnector(row);
    const secretBadge = clean.secretStatus.hasConfiguredSecrets
      ? ` • Secrets protected (${clean.secretStatus.fields.map((f) => f.fingerprint).join(', ')})`
      : '';
    return {
      id: clean.id,
      integrationType: clean.integrationType,
      providerName: clean.providerName,
      isActive: clean.isActive,
      configSummary: `${clean.configSummary}${secretBadge}`,
      updatedAt: clean.updatedAt,
    };
  });
}

export class IntegrationFoundationService {
  static async getTenantIntegrationState(tenantId: string): Promise<TenantIntegrationState> {
    const { data, error } = await supabaseAdmin
      .from('integration_configs')
      .select('id, integration_type, provider_name, is_active, config, updated_at')
      .eq('tenant_id', tenantId)
      .order('provider_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch integration configurations: ${error.message}`);
    }

    const connectors = ((data || []) as RawIntegrationRow[]).map(toSanitizedConnector);

    return {
      independentMode: true,
      externalDependencyRequired: false,
      modeDescription:
        'AI ExamGuard operates standalone by default. Courses, user accounts, assessments, proctoring telemetry, and reporting require zero external LMS or SSO connectivity.',
      secretProtectionPolicy:
        'Write-only secret storage enforced server-side. Client secrets, signing keys, API tokens, and HMAC secrets are stripped from all API responses, dashboard payloads, and audit logs.',
      connectors,
      contracts: INTEGRATION_PROTOCOL_CONTRACTS,
    };
  }

  static async upsertTenantConnector(params: {
    tenantId: string;
    actorUserId: string;
    integrationType: IntegrationType;
    providerName: string;
    protocol?: IntegrationProtocolId | null;
    isActive: boolean;
    publicConfig: Record<string, unknown>;
    secretInputs?: Record<string, string>;
  }): Promise<SanitizedIntegrationConnector> {
    const normalizedProvider = params.providerName.trim();
    if (!normalizedProvider) {
      throw new Error('Provider name is required.');
    }

    const { data: existingRow } = await supabaseAdmin
      .from('integration_configs')
      .select('id, config')
      .eq('tenant_id', params.tenantId)
      .eq('integration_type', params.integrationType)
      .eq('provider_name', normalizedProvider)
      .maybeSingle();

    const publicPayload: Record<string, unknown> = {
      ...params.publicConfig,
      ...(params.protocol ? { protocol: params.protocol } : {}),
    };

    const mergedConfig = mergeIntegrationConfigForStorage({
      existingRawConfig: (existingRow?.config as Record<string, unknown> | null) ?? null,
      publicConfig: publicPayload,
      secretInputs: params.secretInputs,
    });

    const { data: savedRow, error: saveError } = await supabaseAdmin
      .from('integration_configs')
      .upsert(
        {
          tenant_id: params.tenantId,
          integration_type: params.integrationType,
          provider_name: normalizedProvider,
          is_active: params.isActive,
          config: mergedConfig,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,integration_type,provider_name' }
      )
      .select('id, integration_type, provider_name, is_active, config, updated_at')
      .single();

    if (saveError || !savedRow) {
      throw new Error(`Failed to persist integration configuration: ${saveError?.message ?? 'Unknown error'}`);
    }

    const updatedSecretKeys = Object.entries(params.secretInputs || {})
      .filter(([, val]) => typeof val === 'string' && val.trim().length > 0)
      .map(([k]) => k);

    const sanitized = toSanitizedConnector(savedRow as RawIntegrationRow);

    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: params.tenantId,
      user_id: params.actorUserId,
      action: 'SETTINGS_CHANGED',
      entity_type: 'integration_config',
      entity_id: sanitized.id,
      details: {
        auditCategory: 'INTEGRATION_CONFIG_UPDATED',
        integrationType: sanitized.integrationType,
        providerName: sanitized.providerName,
        protocol: sanitized.protocol,
        isActive: sanitized.isActive,
        endpoint: sanitized.publicConfig.endpoint ?? null,
        updatedSecretKeys,
        secretsExposed: false,
      },
    });

    return sanitized;
  }

  static async deleteTenantConnector(params: {
    tenantId: string;
    actorUserId: string;
    integrationId: string;
  }): Promise<void> {
    const { data: existing } = await supabaseAdmin
      .from('integration_configs')
      .select('id, integration_type, provider_name')
      .eq('id', params.integrationId)
      .eq('tenant_id', params.tenantId)
      .maybeSingle();

    if (!existing) {
      throw new Error('Integration configuration not found in your university tenant.');
    }

    const { error } = await supabaseAdmin
      .from('integration_configs')
      .delete()
      .eq('id', params.integrationId)
      .eq('tenant_id', params.tenantId);

    if (error) {
      throw new Error(`Failed to delete integration configuration: ${error.message}`);
    }

    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: params.tenantId,
      user_id: params.actorUserId,
      action: 'SETTINGS_CHANGED',
      entity_type: 'integration_config',
      entity_id: params.integrationId,
      details: {
        auditCategory: 'INTEGRATION_CONFIG_REMOVED',
        integrationType: existing.integration_type,
        providerName: existing.provider_name,
      },
    });
  }
}
