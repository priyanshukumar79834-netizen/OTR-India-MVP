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
 */
export function decideConsent(input: {
  clientId: string;
  requestedFields: string[];
  decision: 'GRANTED' | 'DENIED';
  purpose?: string;
}) {
  return api.post<ConsentDecisionResult>('/consent/decisions', input);
}

export function fetchConsentHistory() {
  return api.get<{ entries: ConsentEntry[] }>('/consent/history');
}
