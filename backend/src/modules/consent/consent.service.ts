import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { consents } from '../../db/schema';
import { generateConsentReference } from '../../utils/idGenerator';
import { recordAuditEvent } from '../audit/audit.service';
import { assertFieldsWithinAllowedScopes, getActiveClient } from '../government-clients/governmentClients.service';
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
 */
export async function decideConsent(userId: string, input: DecideConsentInput) {
  const client = await getActiveClient(input.clientId);
  assertFieldsWithinAllowedScopes(client.allowedScopes as string[], input.requestedFields);

  const [consentRow] = await db
    .insert(consents)
    .values({
      userId,
      consentReference: generateConsentReference(),
      requestingApp: client.name,
      clientId: client.clientId,
      requestedFields: input.requestedFields,
      grantedFields: input.decision === 'GRANTED' ? input.requestedFields : null,
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
    scopes: input.requestedFields,
    purpose: input.purpose,
  });

  return { consent: consentRow, accessToken: { id: tokenRow.id, token: tokenRow.token, expiresAt: tokenRow.expiresAt } };
}

export async function listConsentHistoryForUser(userId: string) {
  return db.select().from(consents).where(eq(consents.userId, userId)).orderBy(desc(consents.decidedAt));
}
