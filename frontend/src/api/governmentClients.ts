import { api } from './client';

export interface GovernmentClient {
  clientId: string;
  name: string;
  organisation: string;
  allowedScopes: string[];
}

export function fetchGovernmentClients() {
  return api.get<{ entries: GovernmentClient[] }>('/government-clients');
}

export interface AuthorizationRequest {
  requestId: string;
  client: { clientId: string; name: string; organisation: string };
  purpose: string | null;
  /** Server-resolved — exactly what THIS transaction asked for, never a
   * client's full allowedScopes ceiling. This is what Phase 3 changes:
   * AuthorizePage.tsx used to show `client.allowedScopes` (the ceiling)
   * because it had no other source of "what does this request actually
   * want right now." */
  requestedFields: string[];
  /** The requesting client's own registered callback URL. AuthorizePage.tsx
   * uses this — never a browser-supplied `redirect_uri` query param — to
   * send the citizen back after a decision. */
  redirectUri: string;
  expiresAt: string;
}

/**
 * Phase 3 — resolves the opaque `request_id` a government portal's own
 * backend created via the government-client-authenticated
 * `POST /api/government-clients/requests` (Phase 2). Requires the citizen
 * to already be logged in (requireAuth on the backend); ProtectedRoute +
 * LoginPage already preserve `?request_id=...` through the login redirect.
 */
export function fetchAuthorizationRequest(requestId: string) {
  return api.get<AuthorizationRequest>(`/government-clients/requests/${encodeURIComponent(requestId)}`);
}
