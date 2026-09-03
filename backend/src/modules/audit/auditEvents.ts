/**
 * Shared audit event vocabulary (MASTER_SPECIFICATION.md §24).
 *
 * This is a CORE/INTEGRATION contract, not owned by any single module.
 * Every module that emits an audit event should use one of these
 * constants (or extend this list here, with a one-line note on why)
 * rather than inventing an ad-hoc string — otherwise Adi's audit-history
 * UI and any future analytics can't rely on a closed set of event types.
 *
 * Current owners of each event (for reference — this file doesn't
 * enforce who calls it, that's a code-review/PR concern):
 *   LOGIN, PROFILE_UPDATED              -> Priyanshu (auth + profile foundation)
 *   CONSENT_REQUESTED/GRANTED/DENIED    -> Anchal (consent module)
 *   DATA_ACCESSED, DOCUMENT_ACCESSED    -> Harsh (interoperability) / Anchal (documents)
 *   APPLICATION_CREATED/SUBMITTED       -> Anchal (application flow)
 */
export const AUDIT_EVENTS = [
  'LOGIN',
  'PROFILE_UPDATED',
  'CONSENT_REQUESTED',
  'CONSENT_GRANTED',
  'CONSENT_DENIED',
  'DATA_ACCESSED',
  'DOCUMENT_ACCESSED',
  'APPLICATION_CREATED',
  'APPLICATION_SUBMITTED',
  // Added during single-owner MVP consolidation (Sept 2026) — extends the
  // vocabulary rather than inventing ad-hoc strings, per the rule above.
  'DOCUMENT_UPLOADED', // Anchal's module: citizen uploads/saves a document to OTR
  'ACCESS_TOKEN_ISSUED', // core: opaque access token created after a GRANTED consent
  'ACCESS_TOKEN_REVOKED', // core: citizen or system revokes a previously issued token
] as const;

export type AuditEvent = (typeof AUDIT_EVENTS)[number];

export const AUDIT_RESULTS = ['SUCCESS', 'FAILURE'] as const;
export type AuditResult = (typeof AUDIT_RESULTS)[number];
