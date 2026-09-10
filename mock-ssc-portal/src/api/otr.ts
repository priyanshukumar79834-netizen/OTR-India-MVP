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
 * Phase 3 — starting "Continue with OTR" is now a TWO-step handoff, not a
 * browser-built URL:
 *
 *  1. This app's OWN backend (mock-ssc-portal/server/, a genuinely
 *     separate small Node process holding the SSC client secret) calls
 *     OTR's authenticated `POST /api/government-clients/requests` with
 *     HTTP Basic client_id:secret, using ITS OWN server-known
 *     redirectUri/requestedFields — never anything the browser sent it.
 *     That's what `startAuthorization()` below calls, via the same-origin
 *     `/api/ssc/authorize-requests` route (see vite.config.ts's dev proxy
 *     — in production this is whatever server-side route this app's own
 *     hosting exposes at that path, e.g. a serverless function).
 *  2. THIS browser only ever receives the opaque `requestId` that step
 *     produced, and navigates to OTR with only that. It never sees the
 *     client secret, and it never gets to choose client_id/redirect_uri/
 *     requestedFields itself — those are exactly the values a browser
 *     could previously forge under the pre-Phase-3 flow.
 */
export interface StartedAuthorization {
  requestId: string;
  expiresAt: string;
}

/**
 * Calls this app's own backend bridge — same-origin, so no CORS/secret
 * concerns here (unlike every other call in this file, which talks
 * directly to OTR's backend). See mock-ssc-portal/server/src/index.ts.
 */
export async function startAuthorization(purpose?: string): Promise<StartedAuthorization> {
  const res = await fetch('/api/ssc/authorize-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(purpose ? { purpose } : {}),
  });

  let body: ApiEnvelope<StartedAuthorization> | null = null;
  try {
    body = await res.json();
  } catch {
    // fall through
  }

  if (!res.ok || !body || !body.success || !body.data) {
    const code = body?.error?.code ?? `HTTP_${res.status}`;
    const message =
      body?.error?.message ?? 'Could not start authorization. Is the GovRecruit-A server running?';
    throw new OtrApiError(res.status, code, message);
  }

  return body.data;
}

/**
 * Builds the full-page cross-site navigation URL to OTR, carrying ONLY
 * the opaque `request_id` produced by `startAuthorization()` above. This
 * is the same shape a real "Continue with Google"-style redirect takes —
 * the browser moves from this origin to OTR's origin — but the only
 * thing it can possibly carry is a reference to a request OTR's backend
 * already authenticated and validated, never a client_id/redirect_uri
 * this page could construct itself.
 */
export function buildAuthorizeUrl(requestId: string): string {
  const url = new URL('/authorize', OTR_APP_URL);
  url.searchParams.set('request_id', requestId);
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
