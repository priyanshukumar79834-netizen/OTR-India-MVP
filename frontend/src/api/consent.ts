import { api } from './client';

export interface ConsentEntry {
  id: string;
  userId: string;
  consentReference: string;
  requestingApp: string;
  clientId: string | null;
  requestedFields: string[];
  grantedFields: string[] | null;
  decision: 'GRANTED' | 'DENIED' | 'EXPIRED';
  decidedAt: string;
  expiresAt: string | null;
}

export interface IssuedAccessToken {
  id: string;
  token: string;
  expiresAt: string;
}

export interface ConsentDecisionResult {
  consent: ConsentEntry;
  accessToken: IssuedAccessToken | null;
}

/**
 * Records the citizen's grant/deny decision. On GRANTED, the backend
 * issues a scoped access token — see docs/ARCHITECTURE_DECISIONS.md.
 * This does NOT retrieve or move any profile data itself; that only
 * happens later, when the token is presented to /api/access/data — see
 * api/access.ts. Keeping these as two separate calls (rather than one
 * "consent and fetch" call) is deliberate: it's what makes this an
 * authorization step, not an autofill step.
 *
 * Phase 3: the real, cross-site consent screen (AuthorizePage.tsx) always
 * calls this with `{ requestId, decision }` — a reference to the
 * server-created, government-client-authenticated authorization request
 * (see api/governmentClients.ts, fetchAuthorizationRequest). clientId/
 * requestedFields exist on this type only for the legacy/direct path
 * (kept working server-side for compatibility); the frontend never
 * constructs that shape itself anymore.
 */
export function decideConsent(
  input:
    | { requestId: string; decision: 'GRANTED' | 'DENIED' }
    | { clientId: string; requestedFields: string[]; decision: 'GRANTED' | 'DENIED'; purpose?: string }
) {
  return api.post<ConsentDecisionResult>('/consent/decisions', input);
}

export function fetchConsentHistory() {
  return api.get<{ entries: ConsentEntry[] }>('/consent/history');
}
