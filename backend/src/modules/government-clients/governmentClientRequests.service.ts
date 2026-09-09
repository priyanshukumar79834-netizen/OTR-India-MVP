import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { accessRequests } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { generateAuthorizationRequestId } from '../../utils/idGenerator';
import { recordAuditEvent } from '../audit/audit.service';
import { assertFieldsWithinAllowedScopes, getActiveClient } from './governmentClients.service';

/**
 * Phase 2 — server-created authorization requests.
 *
 * This is the missing server-to-server hop identified in the architecture
 * review: previously a citizen's browser could supply `client_id`,
 * `requestedFields`, `purpose`, and `redirect_uri` directly to the consent
 * endpoint. From here on, ONLY an authenticated government client
 * (verified by `requireGovClientAuth`) can create the row that
 * clientId/redirectUri/purpose/requestedFields ultimately come from — the
 * browser only ever carries the opaque `requestId` forward.
 *
 * Deliberately does NOT touch consent.service.ts in this phase (per the
 * Phase 2 brief: "clean service boundary to consume it," not full
 * rewiring) — that integration is Phase 3.
 */

const REQUEST_TTL_MS = 1000 * 60 * 10; // 10 minutes, per the Phase 2 brief

export interface CreateAuthorizationRequestInput {
  redirectUri: string;
  purpose?: string;
  requestedFields: string[];
}

export interface AuthorizationRequestSummary {
  requestId: string;
  clientId: string;
  clientName: string;
  organisation: string;
  purpose: string | null;
  requestedFields: string[];
  redirectUri: string;
  status: string;
  expiresAt: Date;
}

function toSummary(row: typeof accessRequests.$inferSelect, clientName: string, organisation: string): AuthorizationRequestSummary {
  return {
    requestId: row.requestId,
    clientId: row.clientId,
    clientName,
    organisation,
    purpose: row.purpose,
    requestedFields: row.requestedFields as string[],
    redirectUri: row.redirectUri,
    status: row.status,
    expiresAt: row.expiresAt,
  };
}

/**
 * Called only from a route protected by `requireGovClientAuth` — `clientId`
 * here MUST be `req.govClientId` (the authenticated identity), never a
 * value read from the request body.
 */
export async function createAuthorizationRequest(
  clientId: string,
  input: CreateAuthorizationRequestInput
): Promise<AuthorizationRequestSummary> {
  const client = await getActiveClient(clientId);

  const registeredRedirectUris = (client.redirectUris as string[] | null) ?? [];
  if (!registeredRedirectUris.includes(input.redirectUri)) {
    await recordAuditEvent({
      event: 'CLIENT_REQUEST_REJECTED',
      result: 'FAILURE',
      requestingSystem: clientId,
    });
    throw new AppError(
      400,
      'REDIRECT_URI_NOT_ALLOWED',
      'redirectUri is not in this client\u2019s registered allowlist'
    );
  }

  try {
    assertFieldsWithinAllowedScopes(client.allowedScopes as string[], input.requestedFields);
  } catch (err) {
    await recordAuditEvent({
      event: 'CLIENT_REQUEST_REJECTED',
      result: 'FAILURE',
      requestingSystem: clientId,
    });
    throw err;
  }

  const [row] = await db
    .insert(accessRequests)
    .values({
      requestId: generateAuthorizationRequestId(),
      clientId,
      requestingApp: client.name,
      redirectUri: input.redirectUri,
      purpose: input.purpose ?? null,
      requestedFields: input.requestedFields,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + REQUEST_TTL_MS),
    })
    .returning();

  await recordAuditEvent({
    event: 'CLIENT_REQUEST_CREATED',
    result: 'SUCCESS',
    requestingSystem: clientId,
  });

  return toSummary(row, client.name, client.organisation);
}

/**
 * Resolves an opaque `requestId` for display/consent purposes. Verifies
 * every condition listed in the Phase 2 brief (§4) — exists, PENDING,
 * unexpired, client still active, redirect URI still registered — and
 * fails closed on all of them. Lazily flips a stale PENDING-but-expired
 * row to EXPIRED so the status column stays accurate for anyone querying
 * it later (e.g. an audit review), not just for this call.
 *
 * Errors are deliberately generic (`REQUEST_NOT_FOUND`) regardless of
 * WHY a request can't be resolved (never existed vs. expired vs.
 * consumed vs. client deactivated) — this is what "do not leak whether
 * an arbitrary request ID belongs to another citizen/client" means in
 * practice: the failure mode looks identical from the outside.
 */
export async function resolveAuthorizationRequest(requestId: string): Promise<AuthorizationRequestSummary> {
  const row = await db.query.accessRequests.findFirst({
    where: eq(accessRequests.requestId, requestId),
  });

  if (!row) {
    throw new AppError(404, 'REQUEST_NOT_FOUND', 'This authorization request does not exist or is no longer valid.');
  }

  if (row.status !== 'PENDING') {
    throw new AppError(404, 'REQUEST_NOT_FOUND', 'This authorization request does not exist or is no longer valid.');
  }

  if (row.expiresAt.getTime() <= Date.now()) {
    await db.update(accessRequests).set({ status: 'EXPIRED' }).where(eq(accessRequests.id, row.id));
    throw new AppError(404, 'REQUEST_NOT_FOUND', 'This authorization request does not exist or is no longer valid.');
  }

  let client;
  try {
    client = await getActiveClient(row.clientId);
  } catch {
    throw new AppError(404, 'REQUEST_NOT_FOUND', 'This authorization request does not exist or is no longer valid.');
  }

  const registeredRedirectUris = (client.redirectUris as string[] | null) ?? [];
  if (!registeredRedirectUris.includes(row.redirectUri)) {
    throw new AppError(404, 'REQUEST_NOT_FOUND', 'This authorization request does not exist or is no longer valid.');
  }

  return toSummary(row, client.name, client.organisation);
}

/**
 * Marks a PENDING request CONSUMED (one-time — a second call fails, which
 * is exactly the anti-replay property Phase 3's consent-grant path needs).
 * Not wired to any route yet; exists so Phase 3 has a ready-made,
 * already-tested function to call after issuing a token.
 */
export async function consumeAuthorizationRequest(requestId: string, userId: string): Promise<void> {
  const row = await resolveAuthorizationRequest(requestId); // re-validates PENDING/unexpired/client-active
  await db
    .update(accessRequests)
    .set({ status: 'CONSUMED', consumedAt: new Date(), userId })
    .where(eq(accessRequests.requestId, row.requestId));
}

/**
 * Marks a PENDING request DENIED. Same anti-replay property as consume —
 * once DENIED, `resolveAuthorizationRequest` will reject it. Not wired to
 * any route yet; for Phase 3's consent-deny path to call.
 */
export async function denyAuthorizationRequest(requestId: string, userId: string): Promise<void> {
  const row = await resolveAuthorizationRequest(requestId);
  await db
    .update(accessRequests)
    .set({ status: 'DENIED', consumedAt: new Date(), userId })
    .where(eq(accessRequests.requestId, row.requestId));
}
