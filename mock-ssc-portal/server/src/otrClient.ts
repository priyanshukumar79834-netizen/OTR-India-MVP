import { env } from './env';
import { SSC_REQUESTED_FIELDS } from './requestedFields';

export class OtrRequestError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export interface CreatedAuthorizationRequest {
  requestId: string;
  expiresAt: string;
}

/**
 * The one and only place in this whole app (frontend or server) that
 * constructs the client-secret Basic-auth header, and the one and only
 * caller of OTR's government-client-authenticated
 * `POST /api/government-clients/requests`.
 *
 * `purpose` is the only thing this function accepts from a caller —
 * everything security-relevant (which client, which redirect URI, which
 * fields) is fixed here from server-side config, never passed in.
 */
export async function createAuthorizationRequest(purpose?: string): Promise<CreatedAuthorizationRequest> {
  const basicAuth = Buffer.from(`${env.sscClientId}:${env.sscClientSecret}`).toString('base64');

  let res: Response;
  try {
    res = await fetch(`${env.otrApiUrl}/api/government-clients/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        redirectUri: env.sscRedirectUri,
        purpose,
        requestedFields: SSC_REQUESTED_FIELDS,
      }),
    });
  } catch {
    throw new OtrRequestError(502, 'OTR_UNREACHABLE', 'Could not reach OTR-India. Is the OTR backend running?');
  }

  let body: ApiEnvelope<CreatedAuthorizationRequest> | null = null;
  try {
    body = (await res.json()) as ApiEnvelope<CreatedAuthorizationRequest>;
  } catch {
    // fall through — handled by the !body check below
  }

  if (!res.ok || !body || !body.success || !body.data) {
    const code = body?.error?.code ?? `HTTP_${res.status}`;
    const message = body?.error?.message ?? 'OTR-India rejected this authorization request.';
    throw new OtrRequestError(res.status, code, message);
  }

  return body.data;
}
