import type { QuestionType } from '@/types/database';
import type { IntegrationConfigView } from '@/types/dashboard';

export type IntegrationType = IntegrationConfigView['integrationType'];

export type IntegrationProtocolId =
  | 'lti_1_3'
  | 'oidc'
  | 'saml_2_0'
  | 'rest_api'
  | 'webhooks'
  | 'qti_exchange';

export interface IntegrationContractSpec {
  protocol: IntegrationProtocolId;
  integrationType: IntegrationType;
  title: string;
  standard: string;
  mvpStatus: 'independent_default_contract_ready';
  summary: string;
  defaultIndependentBehavior: string;
  reservedEndpoints: Array<{
    method: 'GET' | 'POST' | 'PUT';
    path: string;
    purpose: string;
  }>;
  publicFields: Array<{
    key: string;
    label: string;
    placeholder: string;
    required: boolean;
  }>;
  secretFields: Array<{
    key: string;
    label: string;
    description: string;
  }>;
  sampleRequestContract: Record<string, unknown>;
  sampleResponseOrEventContract: Record<string, unknown>;
}

export const INTEGRATION_PROTOCOL_CONTRACTS: IntegrationContractSpec[] = [
  {
    protocol: 'lti_1_3',
    integrationType: 'lms',
    title: 'LTI 1.3 Advantage',
    standard: '1EdTech LTI 1.3 Core + OIDC + AGS',
    mvpStatus: 'independent_default_contract_ready',
    summary:
      'Launches institutional candidates from Canvas, Moodle, or Blackboard into an AI ExamGuard assessment and passes back trust/grade scores via Assignment and Grade Services (AGS).',
    defaultIndependentBehavior:
      'Disabled by default. Courses, enrollments, exams, and grading run natively inside AI ExamGuard.',
    reservedEndpoints: [
      {
        method: 'GET',
        path: '/api/integrations/lti/login',
        purpose: 'OIDC third-party login initiation redirect from LMS platform',
      },
      {
        method: 'POST',
        path: '/api/integrations/lti/launch',
        purpose: 'Validates signed LTI 1.3 id_token JWT against platform JWKS and resolves session',
      },
      {
        method: 'GET',
        path: '/api/integrations/lti/jwks',
        purpose: 'Exposes AI ExamGuard public RSA verification keys (no private keys exposed)',
      },
    ],
    publicFields: [
      {
        key: 'endpoint',
        label: 'Platform OIDC Auth URL',
        placeholder: 'https://canvas.university.edu/api/lti/authorize_redirect',
        required: true,
      },
      {
        key: 'issuerUrl',
        label: 'Platform Issuer (iss)',
        placeholder: 'https://canvas.instructure.com',
        required: true,
      },
      {
        key: 'clientId',
        label: 'LTI Client ID',
        placeholder: '10000000000042',
        required: true,
      },
      {
        key: 'deploymentId',
        label: 'Deployment ID',
        placeholder: 'lti-deploy-2026-main',
        required: false,
      },
      {
        key: 'jwksUrl',
        label: 'Platform JWKS URI',
        placeholder: 'https://canvas.university.edu/api/lti/security/jwks',
        required: true,
      },
    ],
    secretFields: [
      {
        key: 'toolPrivateKeyPem',
        label: 'Tool Signing Private Key (PEM)',
        description: 'Write-only server key for signing AGS OAuth assertions; never exposed after save.',
      },
    ],
    sampleRequestContract: {
      iss: 'https://canvas.instructure.com',
      aud: '10000000000042',
      sub: 'lms-user-9912',
      deployment_id: 'lti-deploy-2026-main',
      'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
      'https://purl.imsglobal.org/spec/lti/claim/roles': [
        'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner',
      ],
      'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint': {
        lineitem: 'https://canvas.university.edu/api/lti/courses/12/line_items/7',
      },
    },
    sampleResponseOrEventContract: {
      agsScorePassback: {
        userId: 'lms-user-9912',
        scoreGiven: 86,
        scoreMaximum: 100,
        activityProgress: 'Completed',
        gradingProgress: 'FullyGraded',
        comment: 'Verified by AI ExamGuard Trust Engine (NORMAL)',
      },
    },
  },
  {
    protocol: 'oidc',
    integrationType: 'sso',
    title: 'OpenID Connect (OIDC)',
    standard: 'OAuth 2.0 + OIDC 1.0 (PKCE S256)',
    mvpStatus: 'independent_default_contract_ready',
    summary:
      'Federates university login via Azure AD / Entra ID, Okta, or Google Workspace without storing campus passwords in AI ExamGuard.',
    defaultIndependentBehavior:
      'Supabase email/password authentication handles standalone sign-in with zero IdP dependency.',
    reservedEndpoints: [
      {
        method: 'GET',
        path: '/api/integrations/oidc/authorize',
        purpose: 'Generates PKCE code challenge & state for institutional OIDC IdP',
      },
      {
        method: 'GET',
        path: '/api/integrations/oidc/callback',
        purpose: 'Exchanges authorization code on server using write-only client secret and maps tenant roles',
      },
    ],
    publicFields: [
      {
        key: 'endpoint',
        label: 'OIDC Discovery / Issuer URL',
        placeholder: 'https://login.microsoftonline.com/<tenant-guid>/v2.0',
        required: true,
      },
      {
        key: 'clientId',
        label: 'OIDC Application Client ID',
        placeholder: 'examguard-web-prod',
        required: true,
      },
      {
        key: 'roleClaim',
        label: 'Institutional Role Claim',
        placeholder: 'eduPersonScopedAffiliation',
        required: false,
      },
    ],
    secretFields: [
      {
        key: 'clientSecret',
        label: 'OIDC Client Secret',
        description: 'Write-only token exchange credential stored server-side and redacted in UI/APIs.',
      },
    ],
    sampleRequestContract: {
      grant_type: 'authorization_code',
      code_challenge_method: 'S256',
      scope: 'openid profile email',
      roleMappingContract: {
        faculty: 'instructor',
        proctor: 'invigilator',
        student: 'student',
        registrar_admin: 'admin',
      },
    },
    sampleResponseOrEventContract: {
      resolvedSession: {
        email: 'student@university.edu',
        tenantSlug: 'demo-university',
        mappedRole: 'student',
        authMethod: 'oidc_federated',
      },
    },
  },
  {
    protocol: 'saml_2_0',
    integrationType: 'sso',
    title: 'SAML 2.0 WebSSO',
    standard: 'OASIS SAML 2.0 HTTP-POST Binding',
    mvpStatus: 'independent_default_contract_ready',
    summary:
      'Supports Shibboleth and InCommon university identity providers using signed XML assertions and SP metadata.',
    defaultIndependentBehavior:
      'Standalone accounts and role memberships remain authoritative until a campus admin enables SAML 2.0.',
    reservedEndpoints: [
      {
        method: 'GET',
        path: '/api/integrations/saml/metadata',
        purpose: 'Returns SP EntityID, ACS URL, and public X.509 signing certificate',
      },
      {
        method: 'POST',
        path: '/api/integrations/saml/acs',
        purpose: 'Verifies XML signature against IdP cert and establishes institutional session',
      },
    ],
    publicFields: [
      {
        key: 'endpoint',
        label: 'IdP Single Sign-On URL (HTTP-POST)',
        placeholder: 'https://idp.university.edu/idp/profile/SAML2/POST/SSO',
        required: true,
      },
      {
        key: 'idpEntityId',
        label: 'IdP Entity ID',
        placeholder: 'https://idp.university.edu/idp/shibboleth',
        required: true,
      },
      {
        key: 'spEntityId',
        label: 'Service Provider Entity ID',
        placeholder: 'https://examguard.university.edu/saml/sp',
        required: false,
      },
    ],
    secretFields: [
      {
        key: 'spPrivateKeyPem',
        label: 'SP Decryption / Signing Private Key',
        description: 'Write-only PEM key used solely for decrypting SAML assertions.',
      },
    ],
    sampleRequestContract: {
      binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
      nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      requiredAttributes: ['mail', 'displayName', 'eduPersonPrimaryAffiliation'],
    },
    sampleResponseOrEventContract: {
      spMetadataSummary: {
        entityId: 'https://examguard.university.edu/saml/sp',
        acsUrl: '/api/integrations/saml/acs',
        wantAssertionsSigned: true,
      },
    },
  },
  {
    protocol: 'rest_api',
    integrationType: 'analytics',
    title: 'Institutional REST APIs',
    standard: 'JSON REST v1 • Scoped Bearer Tokens • Cursor Pagination',
    mvpStatus: 'independent_default_contract_ready',
    summary:
      'Allows campus ERP/registrar pipelines to pull verified submission summaries, integrity statuses, and aggregate analytics without exposing internal database credentials.',
    defaultIndependentBehavior:
      'Internal dashboard UIs consume server-authenticated Next.js API routes directly.',
    reservedEndpoints: [
      {
        method: 'GET',
        path: '/api/reports',
        purpose: 'Active Phase 12 tenant-scoped reporting endpoint across 7 reports & 8 filters',
      },
      {
        method: 'GET',
        path: '/api/reports/export',
        purpose: 'Active Phase 12 CSV export endpoint with automated administrative audit logging',
      },
    ],
    publicFields: [
      {
        key: 'endpoint',
        label: 'Consumer Base Callback / Allowed Origin',
        placeholder: 'https://erp.university.edu/api/examguard-sync',
        required: true,
      },
      {
        key: 'allowedScopes',
        label: 'Granted Read Scopes',
        placeholder: 'reports:read sessions:read review:read',
        required: false,
      },
    ],
    secretFields: [
      {
        key: 'apiKey',
        label: 'Scoped Integration API Key',
        description: 'Write-only bearer credential; masked fingerprint shown after persistence.',
      },
    ],
    sampleRequestContract: {
      headers: {
        Authorization: 'Bearer <redacted-tenant-scoped-token>',
        'X-ExamGuard-Tenant': 'demo-university',
      },
      query: {
        reportType: 'examination_submission',
        department: 'CS',
        limit: 100,
      },
    },
    sampleResponseOrEventContract: {
      meta: {
        tenantId: 'uuid',
        reportType: 'examination_submission',
        totalRows: 42,
        generatedAt: '2026-11-11T16:30:00.000Z',
      },
      data: ['...rows'],
    },
  },
  {
    protocol: 'webhooks',
    integrationType: 'notification',
    title: 'Signed Event Webhooks',
    standard: 'HTTPS JSON + HMAC-SHA256 Signatures',
    mvpStatus: 'independent_default_contract_ready',
    summary:
      'Emits real-time notifications when an examination is published, a session enters PRIORITY_REVIEW, or an invigilator escalates a review case.',
    defaultIndependentBehavior:
      'Events persist natively in Supabase Realtime (`proctor_events` and `review_cases`).',
    reservedEndpoints: [
      {
        method: 'POST',
        path: '<configured-subscriber-endpoint>',
        purpose: 'Outbound signed webhook delivery with X-ExamGuard-Signature header',
      },
    ],
    publicFields: [
      {
        key: 'endpoint',
        label: 'Webhook Subscriber HTTPS URL',
        placeholder: 'https://campus-soc.university.edu/hooks/examguard',
        required: true,
      },
      {
        key: 'subscribedEvents',
        label: 'Subscribed Event Topics',
        placeholder: 'monitoring.priority_review,review.escalated,session.submitted',
        required: false,
      },
    ],
    secretFields: [
      {
        key: 'webhookSecret',
        label: 'HMAC Signing Secret',
        description: 'Used to compute X-ExamGuard-Signature: sha256=<hmac>; never returned in API responses.',
      },
    ],
    sampleRequestContract: {
      headers: {
        'Content-Type': 'application/json',
        'X-ExamGuard-Delivery': 'evt-uuid',
        'X-ExamGuard-Signature': 'sha256=<hmac-hex>',
      },
      retryPolicy: {
        maxAttempts: 5,
        backoffStrategy: 'exponential_with_jitter',
      },
    },
    sampleResponseOrEventContract: {
      id: 'evt-uuid',
      type: 'monitoring.priority_review',
      universityId: 'tenant-uuid',
      occurredAt: '2026-11-11T16:35:12.000Z',
      data: {
        sessionId: 'session-uuid',
        riskCategory: 'PRIORITY_REVIEW',
        reviewStatus: 'pending',
      },
    },
  },
  {
    protocol: 'qti_exchange',
    integrationType: 'storage',
    title: 'QTI Question Exchange',
    standard: '1EdTech QTI 2.1 / 3.0 AssessmentItem Contract',
    mvpStatus: 'independent_default_contract_ready',
    summary:
      'Standardizes bidirectional mapping between QTI assessment items and AI ExamGuard question banks without binding the exam engine to an external repository.',
    defaultIndependentBehavior:
      'Questions are authored and stored locally in AI ExamGuard `questions` tables.',
    reservedEndpoints: [
      {
        method: 'POST',
        path: '/api/integrations/qti/validate',
        purpose: 'Planned dry-run schema validator for QTI 2.1 / 3.0 manifest packages',
      },
    ],
    publicFields: [
      {
        key: 'endpoint',
        label: 'Content Package Registry URI',
        placeholder: 'https://content.university.edu/qti/v3',
        required: false,
      },
      {
        key: 'qtiVersion',
        label: 'QTI Specification Version',
        placeholder: '3.0',
        required: false,
      },
    ],
    secretFields: [
      {
        key: 'repositoryToken',
        label: 'Repository Access Token',
        description: 'Optional write-only credential for external item banks; redacted in responses.',
      },
    ],
    sampleRequestContract: {
      qtiVersion: '3.0',
      identifier: 'qti-cs201-item-001',
      interactionType: 'choiceInteraction',
      maxChoices: 1,
      mapping: {
        choiceInteractionSingle: 'mcq_single',
        choiceInteractionMulti: 'mcq_multiple',
        textEntryInteraction: 'short_answer',
        extendedTextInteraction: 'essay',
      },
    },
    sampleResponseOrEventContract: {
      examGuardQuestionContract: {
        type: 'mcq_single',
        difficulty: 'medium',
        points: 5,
        prompt: 'Which complexity describes binary search on a sorted array?',
        optionsCount: 4,
      },
    },
  },
];

export interface QtiMappedItemSummary {
  identifier: string;
  qtiInteraction: string;
  mappedQuestionType: QuestionType;
  points: number;
  promptPreview: string;
}

/**
 * Pure local QTI 2.1/3.0 -> AI ExamGuard contract preview helper.
 * Operates completely standalone with zero external LMS dependency.
 */
export function buildQtiExchangeManifestPreview(params: {
  examTitle: string;
  courseCode: string;
  questions: Array<{
    id: string;
    type: QuestionType;
    prompt: string;
    points: number;
    difficulty: string;
  }>;
}): {
  standard: 'QTI 3.0 JSON-LD Contract Preview';
  courseCode: string;
  examTitle: string;
  itemCount: number;
  items: QtiMappedItemSummary[];
} {
  const interactionMap: Record<QuestionType, string> = {
    mcq_single: 'qti-choice-interaction (max-choices=1)',
    mcq_multiple: 'qti-choice-interaction (max-choices=0)',
    true_false: 'qti-choice-interaction (boolean-pair)',
    short_answer: 'qti-text-entry-interaction',
    essay: 'qti-extended-text-interaction',
  };

  return {
    standard: 'QTI 3.0 JSON-LD Contract Preview',
    courseCode: params.courseCode,
    examTitle: params.examTitle,
    itemCount: params.questions.length,
    items: params.questions.map((q) => ({
      identifier: `examguard-${q.id.slice(0, 8)}`,
      qtiInteraction: interactionMap[q.type],
      mappedQuestionType: q.type,
      points: q.points,
      promptPreview: q.prompt.slice(0, 100),
    })),
  };
}
