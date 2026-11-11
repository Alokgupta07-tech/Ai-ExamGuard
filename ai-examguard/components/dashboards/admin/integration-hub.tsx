'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Code2,
  FileCode,
  KeyRound,
  Loader2,
  Lock,
  Plug,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { AlertPanel } from '@/components/shared/alert-panel';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  buildQtiExchangeManifestPreview,
  type IntegrationContractSpec,
  type IntegrationProtocolId,
} from '@/lib/integrations/contracts';
import type {
  SanitizedIntegrationConnector,
  TenantIntegrationState,
} from '@/lib/integrations/service';
import { formatShortDateTime } from '@/lib/utils/dashboard-formatters';
import type { QuestionView } from '@/types/dashboard';

export function IntegrationHub({
  questions = [],
  onUpdated,
}: {
  questions?: QuestionView[];
  onUpdated?: () => Promise<void> | void;
}) {
  const [state, setState] = useState<TenantIntegrationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProtocol, setSelectedProtocol] = useState<IntegrationProtocolId>('lti_1_3');
  const [providerName, setProviderName] = useState('Canvas University Production');
  const [publicFields, setPublicFields] = useState<Record<string, string>>({});
  const [secretInputs, setSecretInputs] = useState<Record<string, string>>({});
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'critical';
    title: string;
    message: string;
  } | null>(null);

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/integrations', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        setFeedback({
          tone: 'critical',
          title: 'Failed to Load Integrations',
          message: json?.error || 'Could not load integration contracts.',
        });
        return;
      }
      setState(json as TenantIntegrationState);
    } catch (err: unknown) {
      setFeedback({
        tone: 'critical',
        title: 'Network Error',
        message: (err as Error).message || 'Unable to load integration foundation.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const res = await fetch('/api/admin/integrations', { cache: 'no-store' });
        const json = await res.json();
        if (!active) return;
        if (res.ok) {
          setState(json as TenantIntegrationState);
        } else {
          setFeedback({
            tone: 'critical',
            title: 'Failed to Load Integrations',
            message: json?.error || 'Could not load integration contracts.',
          });
        }
      } catch (err: unknown) {
        if (active) {
          setFeedback({
            tone: 'critical',
            title: 'Network Error',
            message: (err as Error).message || 'Unable to load integration foundation.',
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void init();
    return () => {
      active = false;
    };
  }, []);

  const activeContract: IntegrationContractSpec | undefined = useMemo(
    () => state?.contracts.find((c) => c.protocol === selectedProtocol) ?? state?.contracts[0],
    [state, selectedProtocol]
  );

  const qtiPreview = useMemo(() => {
    const sampleSource = questions.slice(0, 5);
    return buildQtiExchangeManifestPreview({
      courseCode: sampleSource[0]?.courseCode || 'CS-201',
      examTitle: sampleSource[0]?.examTitle || 'Standalone QTI Export Contract Preview',
      questions: sampleSource.map((q) => ({
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        points: q.points,
        difficulty: q.difficulty,
      })),
    });
  }, [questions]);

  const handleSelectProtocol = (protocol: IntegrationProtocolId) => {
    setSelectedProtocol(protocol);
    setPublicFields({});
    setSecretInputs({});
    const defaults: Record<IntegrationProtocolId, string> = {
      lti_1_3: 'Canvas University Production',
      oidc: 'Campus Entra ID / OIDC',
      saml_2_0: 'University Shibboleth IdP',
      rest_api: 'Campus Registrar ERP Client',
      webhooks: 'Institutional SOC Webhook',
      qti_exchange: 'QTI 3.0 Question Bank Exchange',
    };
    setProviderName(defaults[protocol]);
  };

  const handleSaveConnector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContract) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationType: activeContract.integrationType,
          providerName,
          protocol: activeContract.protocol,
          isActive,
          publicConfig: publicFields,
          secretInputs,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedback({
          tone: 'critical',
          title: 'Configuration Failed',
          message: json?.error || 'Could not save integration configuration.',
        });
        return;
      }

      // Immediately clear write-only secrets from browser memory after server save
      setSecretInputs({});
      await loadState();
      if (onUpdated) await onUpdated();
      setFeedback({
        tone: 'success',
        title: 'Integration Contract Saved',
        message: `${providerName} (${activeContract.title}) saved with write-only secret redaction enforced.`,
      });
    } catch (err: unknown) {
      setFeedback({
        tone: 'critical',
        title: 'Save Failed',
        message: (err as Error).message || 'Network error saving connector.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConnector = async (connector: SanitizedIntegrationConnector) => {
    setDeletingId(connector.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/integrations?id=${encodeURIComponent(connector.id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedback({
          tone: 'critical',
          title: 'Delete Failed',
          message: json?.error || 'Failed to delete connector.',
        });
        return;
      }
      await loadState();
      if (onUpdated) await onUpdated();
      setFeedback({
        tone: 'success',
        title: 'Connector Removed',
        message: `Removed ${connector.providerName}. Action logged in audit_logs.`,
      });
    } catch (err: unknown) {
      setFeedback({
        tone: 'critical',
        title: 'Delete Error',
        message: (err as Error).message || 'Unable to remove connector.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const connectorColumns: DataTableColumn<SanitizedIntegrationConnector>[] = [
    {
      key: 'provider',
      header: 'Provider & Protocol',
      render: (c) => (
        <div>
          <p className="font-medium text-foreground">{c.providerName}</p>
          <p className="text-xs font-mono text-muted-foreground">{c.configSummary}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Category',
      render: (c) => (
        <div className="space-y-1">
          <StatusBadge tone="purple" className="uppercase text-[10px]">
            {c.integrationType}
          </StatusBadge>
          {c.protocol && (
            <p className="font-mono text-[11px] text-muted-foreground">{c.protocol}</p>
          )}
        </div>
      ),
    },
    {
      key: 'secrets',
      header: 'Secret Protection',
      render: (c) =>
        c.secretStatus.hasConfiguredSecrets ? (
          <StatusBadge tone="success">
            <Lock className="h-3 w-3 mr-1" />
            Protected ({c.secretStatus.fields.map((f) => f.fingerprint).join(', ')})
          </StatusBadge>
        ) : (
          <StatusBadge tone="neutral">Public Contract Only</StatusBadge>
        ),
    },
    {
      key: 'status',
      header: 'State',
      render: (c) => (
        <div className="space-y-1">
          <StatusBadge tone={c.isActive ? 'cyan' : 'neutral'}>
            {c.isActive ? 'Enabled' : 'Draft / Disabled'}
          </StatusBadge>
          <p className="font-mono text-[11px] text-muted-foreground">
            {formatShortDateTime(c.updatedAt)}
          </p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <Button
          type="button"
          size="xs"
          variant="ghost"
          disabled={deletingId === c.id}
          onClick={() => handleDeleteConnector(c)}
          aria-label={`Remove ${c.providerName}`}
          className="text-muted-foreground hover:text-destructive"
        >
          {deletingId === c.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Standalone Independence & Secret Guarantee Banner */}
      <div className="rounded-xl border border-primary/30 bg-card p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="success">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Independent Core Mode Active
            </StatusBadge>
            <StatusBadge tone="cyan">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Secrets Redacted Server-Side
            </StatusBadge>
          </div>
          <h2 className="font-heading text-base font-semibold text-foreground">
            Modular Integration Foundation (MVP Contracts)
          </h2>
          <p className="text-xs text-muted-foreground max-w-3xl">
            {state?.modeDescription ||
              'AI ExamGuard runs independently by default. External LMS, SSO, REST, Webhook, and QTI adapters are isolated behind clean contracts and disabled until explicitly configured.'}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadState}
          disabled={loading}
          className="shrink-0"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Sync Contracts
        </Button>
      </div>

      {feedback && (
        <AlertPanel
          tone={feedback.tone}
          title={feedback.title}
          description={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      )}

      {/* 6 Supported Integration Protocol Selector */}
      <div className="flex flex-wrap gap-2">
        {(state?.contracts || []).map((contract) => {
          const active = contract.protocol === activeContract?.protocol;
          return (
            <button
              key={contract.protocol}
              type="button"
              onClick={() => handleSelectProtocol(contract.protocol)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium cursor-pointer transition-colors ${
                active
                  ? 'border-primary/60 bg-primary/15 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              <Plug className="h-3.5 w-3.5" />
              <span>{contract.title}</span>
            </button>
          );
        })}
      </div>

      {activeContract && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Configuration Form with Write-Only Secret Inputs */}
          <form
            onSubmit={handleSaveConnector}
            className="lg:col-span-5 rounded-xl border border-border bg-card p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-heading text-base font-semibold text-foreground">
                  {activeContract.title} Foundation
                </h3>
                <p className="text-xs font-mono text-primary mt-0.5">{activeContract.standard}</p>
              </div>
              <StatusBadge tone="neutral">Contract Ready</StatusBadge>
            </div>

            <p className="text-xs text-muted-foreground">{activeContract.summary}</p>

            <div className="space-y-1.5">
              <Label htmlFor="int-provider-name">Provider / Connector Label</Label>
              <Input
                id="int-provider-name"
                required
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
              />
            </div>

            {activeContract.publicFields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`int-pub-${field.key}`}>{field.label}</Label>
                <Input
                  id={`int-pub-${field.key}`}
                  required={field.required}
                  value={publicFields[field.key] || ''}
                  onChange={(e) =>
                    setPublicFields((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  placeholder={field.placeholder}
                />
              </div>
            ))}

            {activeContract.secretFields.map((secret) => (
              <div key={secret.key} className="space-y-1.5">
                <Label htmlFor={`int-sec-${secret.key}`} className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-warning" />
                  <span>{secret.label} (Write-Only)</span>
                </Label>
                <Input
                  id={`int-sec-${secret.key}`}
                  type="password"
                  autoComplete="new-password"
                  value={secretInputs[secret.key] || ''}
                  onChange={(e) =>
                    setSecretInputs((prev) => ({ ...prev, [secret.key]: e.target.value }))
                  }
                  placeholder="Leave blank to keep existing / omit in standalone mode"
                />
                <p className="text-[11px] text-muted-foreground">{secret.description}</p>
              </div>
            ))}

            <label className="flex items-center justify-between rounded-lg border border-border bg-background p-3 text-xs cursor-pointer">
              <span className="text-foreground font-medium">
                Activate external connector (optional)
              </span>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="accent-primary"
              />
            </label>

            <Button type="submit" disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save {activeContract.title} Config
            </Button>
          </form>

          {/* Right: Documented Contract Spec + QTI Preview */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-primary" />
                  <h3 className="font-heading text-sm font-semibold text-foreground">
                    Future Integration Contract Specification
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {activeContract.protocol}
                </span>
              </div>

              <div className="rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">
                <strong className="text-foreground">Default Standalone Behavior:</strong>{' '}
                {activeContract.defaultIndependentBehavior}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Reserved Contract Endpoints
                </p>
                <div className="space-y-1.5">
                  {activeContract.reservedEndpoints.map((ep) => (
                    <div
                      key={`${ep.method}-${ep.path}`}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                    >
                      <span className="font-mono text-primary">
                        {ep.method} {ep.path}
                      </span>
                      <span className="text-muted-foreground">{ep.purpose}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-mono uppercase text-muted-foreground">
                    Request / Claim Contract
                  </p>
                  <pre className="rounded-lg border border-border bg-background p-3 text-[11px] font-mono text-foreground overflow-x-auto max-h-48">
                    {JSON.stringify(activeContract.sampleRequestContract, null, 2)}
                  </pre>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] font-mono uppercase text-muted-foreground">
                    Response / Passback Contract
                  </p>
                  <pre className="rounded-lg border border-border bg-background p-3 text-[11px] font-mono text-foreground overflow-x-auto max-h-48">
                    {JSON.stringify(activeContract.sampleResponseOrEventContract, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {activeContract.protocol === 'qti_exchange' && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-secondary" />
                  <h4 className="font-heading text-sm font-semibold text-foreground">
                    Standalone QTI 3.0 Mapping Preview ({qtiPreview.itemCount} local bank items)
                  </h4>
                </div>
                <pre className="rounded-lg border border-border bg-background p-3 text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-44">
                  {JSON.stringify(qtiPreview, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Configured Tenant Connectors (Redacted) */}
      <DataTable
        data={state?.connectors || []}
        columns={connectorColumns}
        getRowKey={(c) => c.id}
        searchable={false}
        emptyTitle="Running 100% Standalone (No External Connectors Configured)"
        emptyDescription="AI ExamGuard does not require external LMS or IdP connectors. Optionally save a future-ready contract above."
      />
    </div>
  );
}

