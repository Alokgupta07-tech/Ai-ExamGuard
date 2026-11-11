import { NextResponse } from 'next/server';
import { requireRoleActor } from '@/lib/services/dashboard';
import { IntegrationFoundationService } from '@/lib/integrations/service';
import type {
  IntegrationProtocolId,
  IntegrationType,
} from '@/lib/integrations/contracts';
import { handleExamSessionApiError } from '@/lib/utils/request-meta';

const VALID_TYPES: IntegrationType[] = ['lms', 'sso', 'analytics', 'storage', 'notification'];
const VALID_PROTOCOLS: IntegrationProtocolId[] = [
  'lti_1_3',
  'oidc',
  'saml_2_0',
  'rest_api',
  'webhooks',
  'qti_exchange',
];

export async function GET() {
  try {
    const actor = await requireRoleActor(['admin']);
    const state = await IntegrationFoundationService.getTenantIntegrationState(actor.tenantId);

    return NextResponse.json(state, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    return handleExamSessionApiError(error, 'Failed to load integration foundation state.');
  }
}

export async function PUT(request: Request) {
  try {
    const actor = await requireRoleActor(['admin']);
    const body = (await request.json()) as {
      integrationType?: string;
      providerName?: string;
      protocol?: string;
      isActive?: boolean;
      publicConfig?: Record<string, unknown>;
      secretInputs?: Record<string, string>;
    };

    if (!body.integrationType || !VALID_TYPES.includes(body.integrationType as IntegrationType)) {
      return NextResponse.json(
        { error: 'Valid integrationType is required (lms, sso, analytics, storage, notification).' },
        { status: 400 }
      );
    }

    if (!body.providerName || body.providerName.trim().length < 2) {
      return NextResponse.json({ error: 'Provider name must be at least 2 characters.' }, { status: 400 });
    }

    const protocol =
      body.protocol && VALID_PROTOCOLS.includes(body.protocol as IntegrationProtocolId)
        ? (body.protocol as IntegrationProtocolId)
        : undefined;

    const connector = await IntegrationFoundationService.upsertTenantConnector({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      integrationType: body.integrationType as IntegrationType,
      providerName: body.providerName,
      protocol,
      isActive: Boolean(body.isActive ?? true),
      publicConfig:
        body.publicConfig && typeof body.publicConfig === 'object' ? body.publicConfig : {},
      secretInputs:
        body.secretInputs && typeof body.secretInputs === 'object' ? body.secretInputs : undefined,
    });

    return NextResponse.json(
      {
        connector,
        secretsExposed: false,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: unknown) {
    return handleExamSessionApiError(error, 'Failed to save integration connector.');
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireRoleActor(['admin']);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Integration id query parameter is required.' }, { status: 400 });
    }

    await IntegrationFoundationService.deleteTenantConnector({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      integrationId: id,
    });

    return NextResponse.json({ deleted: true }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    return handleExamSessionApiError(error, 'Failed to delete integration connector.');
  }
}
