/**
 * This portal's ONLY connection to OTR-India: direct, cross-origin HTTP
 * calls to OTR's public/portal-facing backend endpoints. There is no
 * shared server, no shared session, no direct database access — GovRecruit-A
 * is architecturally a separate system that happens to trust OTR as an
 * authorization + data source, exactly the interoperability story
 * SIH26129 asks for.
 *
 * This app never reads OTR's citizen JWT and never calls anything behind
 * OTR's `requireAuth` middleware — it only ever holds the opaque access
 * token issued to it once, at the moment the citizen approved consent on
 * OTR's own site.
 */

const OTR_API_URL = import.meta.env.VITE_OTR_API_URL ?? 'http://localhost:4000';
export const OTR_APP_URL = import.meta.env.VITE_OTR_APP_URL ?? 'http://localhost:5173';

export const SSC_CLIENT_ID = 'SSC_EXAM_PORTAL';

export class OtrApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${OTR_API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string> | undefined) },
    });
  } catch {
    throw new OtrApiError(0, 'NETWORK_ERROR', 'Could not reach OTR-India. Is the OTR backend running?');
  }

  let body: ApiEnvelope<T> | null = null;
  try {
    body = await res.json();
  } catch {
    // fall through
  }

  if (!res.ok || !body || !body.success) {
    const code = body?.error?.code ?? `HTTP_${res.status}`;
    const message = body?.error?.message ?? 'OTR-India returned an unexpected error.';
    throw new OtrApiError(res.status, code, message);
  }

  return body.data as T;
}

/**
 * Builds the "Continue with OTR" redirect URL. This is a full-page
 * cross-site navigation, not an API call — the browser itself moves from
 * this origin to OTR's origin, exactly like a real "Continue with Google"
 * button. `redirectUri` is where OTR sends the citizen's browser back to
 * once they've decided.
 */
export function buildAuthorizeUrl(params: { redirectUri: string; purpose?: string }): string {
  const url = new URL('/authorize', OTR_APP_URL);
  url.searchParams.set('client_id', SSC_CLIENT_ID);
  url.searchParams.set('redirect_uri', params.redirectUri);
  if (params.purpose) url.searchParams.set('purpose', params.purpose);
  return url.toString();
}

export interface PortalDataResponse {
  /** GovRecruit-A's own field names (candidate_name, dob, ...) — already
   * mapped server-side from OTR's canonical model. Never the canonical
   * shape itself. */
  data: Record<string, unknown>;
  scopes: string[];
  clientId: string;
  purpose: string;
}

/** Retrieves exactly the citizen-authorized fields, mapped to this
 * portal's own field names. Works any number of times, for as long as
 * the token stays valid — this is what makes it a durable authorization,
 * not a one-time handoff (used again later for the admit-card demo). */
export function retrieveAuthorizedData(token: string) {
  return call<PortalDataResponse>('/api/access/data', { method: 'POST', body: JSON.stringify({ token }) });
}

export interface SubmittedApplication {
  id: string;
  applicationRefId: string;
  portalName: string;
  status: string;
  submittedAt: string;
}

/** Records the application on OTR's side using the access token as the
 * credential — this portal has no citizen JWT to authenticate with. */
export function submitApplicationViaToken(input: {
  token: string;
  applicationName: string;
  appSpecificData: Record<string, string>;
}) {
  return call<SubmittedApplication>('/api/applications/via-token', { method: 'POST', body: JSON.stringify(input) });
}
