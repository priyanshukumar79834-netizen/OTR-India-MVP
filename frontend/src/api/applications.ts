import { api } from './client';

export interface ApplicationEntry {
  id: string;
  userId: string;
  applicationRefId: string;
  portalName: string;
  accessTokenId: string | null;
  status: string;
  submittedAt: string;
  appSpecificData?: Record<string, string>;
}

export function fetchMyApplications() {
  return api.get<{ entries: ApplicationEntry[] }>('/applications');
}

/**
 * Submits an application. `accessTokenId` links it to the token used to
 * pull OTR data for this application — a reference for later retrieval
 * demos, never treated as proof the application was submitted (§12).
 */
export function submitApplication(input: {
  clientId: string;
  accessTokenId?: string;
  applicationName: string;
  organisation: string;
  appSpecificData: Record<string, string>;
}) {
  return api.post<ApplicationEntry>('/applications', input);
}
