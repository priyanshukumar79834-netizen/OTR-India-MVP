import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { consents } from '../../db/schema';
import { generateConsentReference } from '../../utils/idGenerator';
import { recordAuditEvent } from '../audit/audit.service';
import { assertFieldsWithinAllowedScopes, getActiveClient } from '../government-clients/governmentClients.service';
import {
  consumeAuthorizationRequest,
  denyAuthorizationRequest,
  resolveAuthorizationRequest,
} from '../government-clients/governmentClientRequests.service';
import { issueAccessToken } from '../access/access.service';
import { DecideConsentInput } from './consent.validation';

/**
 * Records a citizen's grant/deny decision for a requesting portal, and —
 * only on GRANTED — issues the access token the portal will actually use.
 *
 * This is the real enforcement point behind MASTER_SPECIFICATION.md §11:
 * a request for fields the client isn't registered for is rejected before
 * any consent row or token is created (see assertFieldsWithinAllowedScopes),
 * and a DENIED decision never produces a token at all.
 *
 * Phase 3: when `input.requestId` is present, clientId/requestedFields/
 * purpose are ALWAYS re-derived from the server-side `access_requests` row
 * (via resolveAuthorizationRequest) — any clientId/requestedFields the
 * browser might also have sent are ignored outright. This is the whole
 * point of routing consent through a server-created request: the browser
 * can approve or deny, but it can never describe what's being requested.
 * `consumeAuthorizationRequest`/`denyAuthorizationRequest` are called
 * BEFORE the consent row is written, so a replayed/duplicate decision on
 * the same requestId (double-click, back-button, race) fails fast on the
 * request's own one-time state rather than silently issuing a second token.
 */
export async function decideConsent(userId: string, input: DecideConsentInput) {
  let clientId: string;
  let requestedFields: string[];
  let purpose: string;

  if (input.requestId) {
    const requestSummary = await resolveAuthorizationRequest(input.requestId);
    clientId = requestSummary.clientId;
    requestedFields = requestSummary.requestedFields;
    purpose = requestSummary.purpose ?? `${requestSummary.clientName} application`;

    if (input.decision === 'GRANTED') {
      await consumeAuthorizationRequest(input.requestId, userId);
    } else {
      await denyAuthorizationRequest(input.requestId, userId);
    }
  } else {
    // Legacy/direct path — see consent.validation.ts. Schema guarantees
    // both fields are present whenever requestId is absent.
    clientId = input.clientId as string;
    requestedFields = input.requestedFields as string[];
    purpose = input.purpose ?? 'Government application';
  }

  const client = await getActiveClient(clientId);
  assertFieldsWithinAllowedScopes(client.allowedScopes as string[], requestedFields);

  const [consentRow] = await db
    .insert(consents)
    .values({
      userId,
      consentReference: generateConsentReference(),
      requestingApp: client.name,
      clientId: client.clientId,
      requestedFields,
      grantedFields: input.decision === 'GRANTED' ? requestedFields : null,
      decision: input.decision,
    })
    .returning();

  await recordAuditEvent({
    event: input.decision === 'GRANTED' ? 'CONSENT_GRANTED' : 'CONSENT_DENIED',
    userId,
    requestingSystem: client.name,
    result: 'SUCCESS',
  });

  if (input.decision === 'DENIED') {
    return { consent: consentRow, accessToken: null };
  }

  const tokenRow = await issueAccessToken({
    userId,
    clientId: client.clientId,
    consentId: consentRow.id,
    scopes: requestedFields,
    purpose,
  });

  return { consent: consentRow, accessToken: { id: tokenRow.id, token: tokenRow.token, expiresAt: tokenRow.expiresAt } };
}

export async function listConsentHistoryForUser(userId: string) {
  return db.select().from(consents).where(eq(consents.userId, userId)).orderBy(desc(consents.decidedAt));
}
