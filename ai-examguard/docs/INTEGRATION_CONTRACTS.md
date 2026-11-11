# AI ExamGuard — Integration Foundation Contracts

## Standalone Independence Guarantee

AI ExamGuard runs **independently by default**:
- Institutional tenants, courses, enrollments, examinations, question banks, live AI proctoring, review adjudication, and analytics operate locally on Supabase and Next.js with zero external LMS or SSO runtime dependencies.
- External connectors stored in `integration_configs` are strictly opt-in foundations for post-MVP campus rollouts.

---

## Secret Handling & Zero-Exposure Policy

Implemented in `lib/integrations/secret-sanitizer.ts` and enforced in `IntegrationFoundationService`:
- Write-only secret keys (`clientSecret`, `apiKey`, `webhookSecret`, `toolPrivateKeyPem`, `spPrivateKeyPem`, `repositoryToken`, or any key matching `secret|password|private_key|api_key|token|bearer|hmac`) are isolated under server-only storage and stripped before any payload is returned to clients, Server Actions, UI tables, CSV exports, or `audit_logs`.
- API responses and UI views expose **only** `{ configured: true, fingerprint: "••••last4", exposed: false }`.

---

## Documented Future Integration Contracts

### 1. LTI 1.3 Advantage (`lti_1_3`)
- **Reserved Endpoints**:
  - `GET /api/integrations/lti/login` — OIDC third-party login initiation
  - `POST /api/integrations/lti/launch` — Validates LMS `id_token` JWT against Platform JWKS (`iss`, `aud`, `deployment_id`, `message_type=LtiResourceLinkRequest`)
  - `GET /api/integrations/lti/jwks` — Public RSA JWK Set (never exposes private signing key)
- **AGS Score Passback Contract**: `{ userId, scoreGiven, scoreMaximum, activityProgress: "Completed", gradingProgress: "FullyGraded", comment }`.

### 2. OpenID Connect (`oidc`)
- **Reserved Endpoints**: `GET /api/integrations/oidc/authorize`, `GET /api/integrations/oidc/callback`
- **Security**: Authorization Code Flow + PKCE (`S256`) + `nonce`/`state`.
- **Claim-to-Role Contract**: Maps `eduPersonScopedAffiliation` / custom role claim (`faculty -> instructor`, `proctor -> invigilator`, `student -> student`, `registrar_admin -> admin`).

### 3. SAML 2.0 WebSSO (`saml_2_0`)
- **Reserved Endpoints**: `GET /api/integrations/saml/metadata`, `POST /api/integrations/saml/acs`
- **Binding**: OASIS SAML 2.0 `HTTP-POST` with signed assertions and `emailAddress` NameID format.

### 4. Institutional REST APIs (`rest_api`)
- **Active Phase 12 Foundation Endpoints**:
  - `GET /api/reports` — Tenant-scoped JSON reporting across 7 report types and 8 filters
  - `GET /api/reports/export` — RFC-4180 CSV export with administrative `audit_logs` tracking
- **Planned External Scope Header**: `Authorization: Bearer <redacted-tenant-scoped-token>` + `X-ExamGuard-Tenant`.

### 5. Signed Event Webhooks (`webhooks`)
- **Delivery Headers**: `Content-Type: application/json`, `X-ExamGuard-Delivery`, `X-ExamGuard-Signature: sha256=<hmac>`
- **Event Envelope**: `{ id, type, universityId, occurredAt, data }` for topics `monitoring.priority_review`, `review.escalated`, `session.submitted`, `exam.published`.
- **Retry Policy**: Up to 5 attempts with exponential backoff + jitter.

### 6. QTI 2.1 / 3.0 Question Exchange (`qti_exchange`)
- **Local Contract Mapper**: `buildQtiExchangeManifestPreview()` in `lib/integrations/contracts.ts` maps `mcq_single`, `mcq_multiple`, `true_false`, `short_answer`, and `essay` cleanly to `qti-choice-interaction`, `qti-text-entry-interaction`, and `qti-extended-text-interaction` without requiring an external repository.

