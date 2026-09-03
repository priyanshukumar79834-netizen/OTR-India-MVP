import { api } from './client';

export interface AccessTokenSummary {
  id: string;
  clientId: string;
  scopes: string[];
  purpose: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
}

export interface PortalDataResponse {
  /** Portal-native field names -> values. Deliberately NOT the canonical
   * CanonicalProfile shape — this is what the requesting portal actually
   * receives, already mapped to its own field-naming convention (§10). */
  data: Record<string, unknown>;
  scopes: string[];
  clientId: string;
  purpose: string;
}

/**
 * Represents a government portal (e.g. SSC) presenting a previously
 * issued access token to retrieve exactly the citizen-authorized data.
 * This call is deliberately NOT the citizen fetching their own profile —
 * see docs/ARCHITECTURE_DECISIONS.md: "SSC retrieves authorized citizen
 * data from OTR," not "OTR fills in SSC's form."
 */
export function retrieveDataWithToken(token: string) {
  return api.post<PortalDataResponse>('/access/data', { token });
}

export function fetchMyAccessTokens() {
  return api.get<{ entries: AccessTokenSummary[] }>('/access/tokens');
}

export function revokeAccessToken(tokenId: string) {
  return api.post<{ id: string; status: string }>(`/access/tokens/${tokenId}/revoke`);
}
