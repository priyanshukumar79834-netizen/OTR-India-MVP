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
